import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const url = new URL(req.url);
  const task = url.searchParams.get("task") || "all";

  const results: Record<string, unknown> = {};

  // Task 1: Expire digital loans
  if (task === "all" || task === "expire_digital") {
    const { data, error } = await supabase.rpc("expire_digital_loans");
    results.expire_digital = { data, error };
  }

  // Task 2: Mark overdue loans
  if (task === "all" || task === "mark_overdue") {
    const { data, error } = await supabase.rpc("mark_overdue_loans");
    results.mark_overdue = { data, error };
  }

  // Task 3: Send due date reminders (in-app notifications + email)
  if (task === "all" || task === "due_reminders") {
    const { data, error } = await supabase.rpc("send_due_reminders");
    results.due_reminders = { data, error };
  }

  // Task 4: Send overdue email notifications
  if (task === "all" || task === "overdue_email") {
    const { data, error } = await supabase.rpc("send_overdue_email_notifications");
    results.overdue_email = { data, error };
  }

  // Task 5: Send due date email reminders
  if (task === "all" || task === "due_email") {
    const { data, error } = await supabase.rpc("send_due_date_email_reminders");
    results.due_email = { data, error };
  }

  // Task 6: Process pending email queue
  if (task === "all" || task === "process_email") {
    const { data: pending, error: fetchError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (!fetchError && pending && pending.length > 0) {
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@knust.edu.gh";
      const senderName = Deno.env.get("BREVO_SENDER_NAME") || "KNUST Library";

      for (const email of pending) {
        if (!brevoApiKey) {
          await supabase
            .from("email_logs")
            .update({ status: "failed", error_message: "BREVO_API_KEY not configured" })
            .eq("id", email.id);
          continue;
        }

        try {
          const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "api-key": brevoApiKey,
              "accept": "application/json",
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: [{ email: email.email }],
              subject: email.subject,
              htmlContent: email.html,
              textContent: email.text || email.html.replace(/<[^>]*>/g, ''),
            }),
          });

          const result = await response.json();

          await supabase
            .from("email_logs")
            .update({
              status: result.messageId ? "sent" : "failed",
              brevo_response: result,
              error_message: result.code ? result.message : null,
              sent_at: new Date().toISOString(),
            })
            .eq("id", email.id);
        } catch (err) {
          await supabase
            .from("email_logs")
            .update({ status: "failed", error_message: err.message })
            .eq("id", email.id);
        }
      }
      results.process_email = { processed: pending?.length || 0, error: fetchError };
    }

    return new Response(
      JSON.stringify({ ok: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: false, error: "Method not allowed" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});