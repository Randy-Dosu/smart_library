import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { getEmailTemplate } from "./email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject?: string;
  template?: 'borrow_confirmation' | 'due_reminder' | 'overdue_notice' | 'reservation_ready' | 'welcome' | 'password_reset';
  template_data?: Record<string, string>;
  html?: string;
  text?: string;
  type?: 'borrow_confirmation' | 'due_reminder' | 'overdue_notice' | 'reservation_ready' | 'welcome' | 'password_reset';
  user_id?: string;
}

async function sendBrevoEmail(to: string, subject: string, html: string, text?: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@knust.edu.gh";
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "KNUST Library";

  if (!apiKey) {
    return { status: "error", message: "BREVO_API_KEY not configured" };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      "accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || html.replace(/<[^>]*>/g, ''),
    }),
  });

  return response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // POST: Send single email
  if (req.method === "POST") {
    const { to, subject, template, template_data, html, text, type, user_id } = await req.json() as EmailRequest;

    let finalSubject = subject;
    let finalHtml = html;
    let finalText = text;

    // Use template if provided
    if (template && template_data) {
      const tpl = getEmailTemplate(template, template_data);
      finalSubject = finalSubject || tpl.subject;
      finalHtml = finalHtml || tpl.html;
      finalText = finalText || tpl.text;
    }

    if (!to || !finalSubject || !finalHtml) {
      return new Response(
        JSON.stringify({ ok: false, error: "to, subject, and html (or template+template_data) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendBrevoEmail(to, finalSubject, finalHtml, finalText);

    // Log email attempt
    await supabase.from("email_logs").insert({
      email: to,
      subject: finalSubject,
      type: type || template || 'general',
      status: result.messageId ? "sent" : "failed",
      brevo_response: result,
      error_message: result.code ? result.message : null,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        ok: !!result.messageId,
        message: result.messageId ? "Email sent" : result.message,
        message_id: result.messageId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // GET: Process pending email queue
  if (req.method === "GET") {
    const { data: pending, error } = await supabase
      .from("email_logs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    const results = [];

    for (const email of pending || []) {
      const result = await sendBrevoEmail(email.email, email.subject, email.html, email.text);
      
      await supabase
        .from("email_logs")
        .update({
          status: result.messageId ? "sent" : "failed",
          brevo_response: result,
          error_message: result.code ? result.message : null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", email.id);

      results.push({ id: email.id, ...result });
    }

    return new Response(
      JSON.stringify({ ok: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: false, error: "Method not allowed" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});