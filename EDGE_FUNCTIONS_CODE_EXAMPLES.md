# Edge Functions Code Examples & Quick Reference (Brevo Email)

## 1. send-email Function Code

**File:** `supabase/functions/send-email/index.ts`

```typescript
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
```

---

## 2. Email Templates Code

**File:** `supabase/functions/send-email/email-templates.ts`

```typescript
export function getEmailTemplate(type: string, data: Record<string, string>): { subject: string; html: string; text: string } {
  const baseUrl = Deno.env.get("APP_URL") || "https://library.knust.edu.gh";
  
  const templates: Record<string, (data: Record<string, string>) => { subject: string; html: string; text: string }> = {
    borrow_confirmation: (data) => ({
      subject: `Book Borrowed: ${data.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📚 Book Borrowed Successfully</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${data.user_name || 'Student'},</p>
            <p style="font-size: 16px; color: #374151;">You have successfully borrowed <strong style="color: #0f766e;">${data.title}</strong> (${data.format}).</p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.title}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Format:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.format}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${data.due_date}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Loan ID:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">${data.loan_id}</td></tr>
              </table>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>⏰ Reminder:</strong> Please return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and manage your account at the <a href="${baseUrl}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
          </div>
        </body>
        </html>
      `,
      text: `Book Borrowed: ${data.title}\n\nHi ${data.user_name || 'Student'},\n\nYou have successfully borrowed "${data.title}" (${data.format}).\nDue Date: ${data.due_date}\nLoan ID: ${data.loan_id}\n\nPlease return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.\n\nView your loans at: ${baseUrl}/dashboard\n\nKNUST Library Management System`
    },
    due_reminder: (data) => ({
      subject: `Reminder: "${data.title}" is due ${data.due_date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Due Date Reminder</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${data.user_name || 'Student'},</p>
            <p style="font-size: 16px; color: #374151;">This is a friendly reminder that <strong style="color: #f59e0b;">${data.title}</strong> is due on <strong style="color: #dc2626;">${data.due_date}</strong>.</p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.title}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${data.due_date}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Loan ID:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">${data.loan_id}</td></tr>
              </table>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> Please return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and manage your account at the <a href="${baseUrl}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
          </div>
        </body>
        </html>
      `,
      text: `Due Date Reminder: "${data.title}"\n\nHi ${data.user_name || 'Student'},\n\nThis is a reminder that "${data.title}" is due on ${data.due_date}.\nLoan ID: ${data.loan_id}\n\nPlease return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.\n\nView your loans at: ${baseUrl}/dashboard\n\nKNUST Library Management System`
    },
    overdue_notice: (data) => ({
      subject: `OVERDUE: "${data.title}" - ${data.days_overdue} days overdue`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🚨 OVERDUE NOTICE</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${data.user_name || 'Student'},</p>
            <p style="font-size: 16px; color: #374151;">The book <strong style="color: #dc2626;">${data.title}</strong> was due on <strong>${data.due_date}</strong> and is now <strong style="color: #dc2626;">${data.days_overdue} days overdue</strong>.</p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.title}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${data.due_date}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Days Overdue:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${data.days_overdue} days</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Current Fine:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">GHS ${data.fine_amount || data.days_overdue * 5}/day</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Loan ID:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">${data.loan_id}</td></tr>
              </table>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>⚠️ Action Required:</strong> Please return the book immediately to the KNUST Library to stop further fines from accumulating. Current fine rate: GHS 5 per day for physical books.</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and fines at the <a href="${baseUrl}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
          </div>
        </body>
        </html>
      `,
      text: `OVERDUE NOTICE: "${data.title}"\n\nHi ${data.user_name || 'Student'},\n\nThe book "${data.title}" was due on ${data.due_date} and is now ${data.days_overdue} days overdue.\nCurrent Fine: GHS ${data.fine_amount || data.days_overdue * 5}/day\nLoan ID: ${data.loan_id}\n\nPlease return the book immediately to the KNUST Library to stop further fines from accumulating. Fine rate: GHS 5 per day for physical books.\n\nView your loans at: ${baseUrl}/dashboard\n\nKNUST Library Management System`
    },
    reservation_ready: (data) => ({
      subject: `Reservation Ready: "${data.title}" is available`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Reservation Ready</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${data.user_name || 'Student'},</p>
            <p style="font-size: 16px; color: #374151;">Great news! The book <strong style="color: #0f766e;">${data.title}</strong> you reserved is now available for pickup.</p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.title}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Format Available:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.format}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Claim Expires:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${data.claim_expires_at}</td></tr>
              </table>
            </div>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #166534;"><strong>⏰ Claim Window:</strong> You have 48 hours to claim this reservation. After that, it will be offered to the next person in the queue.</p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Claim your reservation at the <a href="${baseUrl}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a> or visit the library counter.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
          </div>
        </body>
        </html>
      `,
      text: `Reservation Ready: "${data.title}"\n\nHi ${data.user_name || 'Student'},\n\nThe book "${data.title}" you reserved is now available for pickup (${data.format}).\nClaim by: ${data.claim_expires_at}\n\nYou have 48 hours to claim this reservation before it expires and is offered to the next person in the queue.\n\nClaim at: ${baseUrl}/dashboard\n\nKNUST Library Management System`
    },
    welcome: (data) => ({
      subject: "Welcome to KNUST Library Management System",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎓 Welcome to KNUST Library!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #374151;">Hi ${data.user_name || 'Student'},</p>
            <p style="font-size: 16px; color: #374151;">Welcome to the KNUST Library Management System! Your account has been created successfully.</p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0f766e;">Your Account Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Name:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.user_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0; color: #111827;">${data.email}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Role:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.role}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Max Loans:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.max_loans} books</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Loan Period:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.loan_period} days</td></tr>
              </table>
            </div>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #166534;"><strong>🚀 Getting Started:</strong> Browse the catalogue, borrow physical or digital books, place reservations, and track your loans and fines all from your dashboard.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard" style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Go to Dashboard</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to KNUST Library!\n\nHi ${data.user_name || 'Student'},\n\nWelcome to the KNUST Library Management System! Your account has been created successfully.\n\nAccount Details:\n- Name: ${data.user_name}\n- Email: ${data.email}\n- Role: ${data.role}\n- Max Loans: ${data.max_loans} books\n- Loan Period: ${data.loan_period} days\n\nGet started at: ${baseUrl}/dashboard\n\nKNUST Library Management System`
    },
  };

  return templates[type]?.(data) || {
    subject: "KNUST Library Notification",
    html: `<p>${JSON.stringify(data)}</p>`,
    text: JSON.stringify(data),
  };
}
```

---

## 2. scheduled-tasks Function Code

**File:** `supabase/functions/scheduled-tasks/index.ts`

```typescript
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

  // Task 5: Process pending email queue
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
```

---

## 3. create-librarian Function Code

**File:** `supabase/functions/create-librarian/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LIBRARIAN_DOMAIN = "lib.knust.edu.gh";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Verify caller is authenticated librarian
    const { data: caller, error: callerErr } = await supabase.auth.getUser();
    if (callerErr || !caller?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = caller.user.id;
    const { data: callerProfile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (profErr || !callerProfile || callerProfile.role !== "librarian") {
      return new Response(
        JSON.stringify({ ok: false, error: "Only librarians can create librarian accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const username = (body?.username ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();
    const fullName = (body?.full_name ?? "").toString().trim();
    const department = (body?.department ?? "").toString().trim();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ ok: false, error: "Username and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ ok: false, error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (username.includes("@")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Enter a username only, not a full email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = `${username}@${LIBRARIAN_DOMAIN}`;

    // Use service role to create user (bypasses RLS and trigger blocks)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "librarian", full_name: fullName, department },
      app_metadata: { role: "librarian", admin_created: "true" }, // Bypasses handle_new_user() block
    });

    if (createErr) {
      return new Response(
        JSON.stringify({ ok: false, error: createErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Librarian account created successfully",
        email_masked: `${username}@•••.knust.edu.gh`,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 4. Frontend Integration Examples

### TypeScript Types

```typescript
// types/edge-functions.ts
export interface EmailRequest {
  to: string;
  subject?: string;
  template?: 'borrow_confirmation' | 'due_reminder' | 'overdue_notice' | 'reservation_ready' | 'welcome' | 'password_reset';
  template_data?: Record<string, string>;
  html?: string;
  text?: string;
  type?: 'borrow_confirmation' | 'due_reminder' | 'overdue_notice' | 'reservation_ready' | 'welcome' | 'password_reset';
  user_id?: string;
}

export interface EmailResponse {
  ok: boolean;
  message: string;
  message_id?: string;
}

export interface ScheduledTaskResponse {
  ok: boolean;
  results: {
    expire_digital?: { data: { ok: boolean; expired: number }; error: unknown };
    mark_overdue?: { data: { ok: boolean; marked_overdue: number }; error: unknown };
    due_reminders?: { data: { ok: boolean; reminders: number; emails_queued: number }; error: unknown };
    overdue_email?: { data: { ok: boolean; emails_queued: number }; error: unknown };
    due_email?: { data: { ok: boolean; emails_queued: number }; error: unknown };
    process_email?: { processed: number; error: unknown };
  };
}

export interface CreateLibrarianRequest {
  username: string;
  password: string;
  full_name: string;
  department: string;
}

export interface CreateLibrarianResponse {
  ok: boolean;
  message: string;
  email_masked: string;
}
```

### React Hooks for Edge Functions

```typescript
// hooks/useEdgeFunctions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import type { EmailRequest, EmailResponse, ScheduledTaskResponse, CreateLibrarianRequest, CreateLibrarianResponse } from '@/types/edge-functions';

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation<EmailResponse, Error, EmailRequest>({
    mutationFn: async (payload) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to send email');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
  });
}

export function useProcessEmailQueue() {
  return useMutation<{ ok: boolean; processed: number }, Error, void>({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
        },
      });
      if (!response.ok) throw new Error('Failed to process email queue');
      return response.json();
    },
  });
}

export function useRunScheduledTasks() {
  return useMutation<ScheduledTaskResponse, Error, string>({
    mutationFn: async (task = 'all') => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scheduled-tasks?task=${task}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to run scheduled tasks');
      return response.json();
    },
  });
}

export function useCreateLibrarian() {
  const queryClient = useQueryClient();

  return useMutation<CreateLibrarianResponse, Error, CreateLibrarianRequest>({
    mutationFn: async (payload) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-librarian`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create librarian');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
    },
  });
}
```

### Usage in Components

```tsx
// components/LibrarianCreateDialog.tsx
import { useCreateLibrarian } from '@/hooks/useEdgeFunctions';

export function LibrarianCreateDialog() {
  const createLibrarian = useCreateLibrarian();
  const [form, setForm] = useState({ username: '', password: '', full_name: '', department: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLibrarian.mutate(form, {
      onSuccess: () => {
        toast.success('Librarian created!');
        setForm({ username: '', password: '', full_name: '', department: '' });
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Username</label>
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="j.doe"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
          required
        />
        <p className="text-xs text-muted-foreground">Email will be username@•••.knust.edu.gh</p>
      </div>
      <div>
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Full Name</label>
        <input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Department</label>
        <input
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      <button
        type="submit"
        disabled={createLibrarian.isPending}
        className="w-full btn-primary"
      >
        {createLibrarian.isPending ? 'Creating...' : 'Create Librarian'}
      </button>
    </form>
  );
}
```

```tsx
// components/EmailDashboard.tsx
import { useProcessEmailQueue, useRunScheduledTasks } from '@/hooks/useEdgeFunctions';

export function EmailDashboard() {
  const processQueue = useProcessEmailQueue();
  const runTasks = useRunScheduledTasks();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => processQueue.mutate()}
          disabled={processQueue.isPending}
          className="btn-secondary"
        >
          {processQueue.isPending ? 'Processing...' : 'Process Email Queue'}
        </button>
        <button
          onClick={() => runTasks.mutate('process_email')}
          disabled={runTasks.isPending}
          className="btn-secondary"
        >
          Run All Scheduled Tasks
        </button>
      </div>

      {processQueue.data && (
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-green-800">Processed {processQueue.data.processed} emails</p>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Environment Variables Reference

### Required for Each Function

| Function | Required Env Vars |
|----------|-------------------|
| `send-email` | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` |
| `scheduled-tasks` | `SUPABASE_SERVICE_ROLE_KEY` |
| `create-librarian` | `SUPABASE_SERVICE_ROLE_KEY` |

### Edge Function Env Vars (Supabase Dashboard)

```env
# send-email
BREVO_API_KEY=your_brevo_key
BREVO_SENDER_EMAIL=noreply@knust.edu.gh
BREVO_SENDER_NAME=KNUST Library

# scheduled-tasks
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# create-librarian
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 6. Testing Commands

```bash
# Test send-email (POST with template)
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@st.knust.edu.gh", "template": "welcome", "template_data": {"user_name": "Test User", "email": "test@st.knust.edu.gh", "role": "Student", "max_loans": "2", "loan_period": "14"}}'

# Test send-email (GET - process queue)
curl -X GET https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ANON_KEY"

# Test scheduled-tasks (all)
curl "https://your-project.supabase.co/functions/v1/scheduled-tasks?task=all" \
  -H "Authorization: Bearer $ANON_KEY"

# Test scheduled-tasks (specific)
curl "https://your-project.supabase.co/functions/v1/scheduled-tasks?task=process_email" \
  -H "Authorization: Bearer $ANON_KEY"

# Test create-librarian (requires librarian JWT)
# 1. Login as librarian in browser
# 2. Get token: localStorage.getItem('supabase.auth.token') -> parse JSON -> access_token
# 3. Use token:
curl -X POST https://your-project.supabase.co/functions/v1/create-librarian \
  -H "Authorization: Bearer LIBRARIAN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "j.doe", "password": "SecurePass123", "full_name": "John Doe", "department": "Computer Science"}'
```

---

## 7. Deployment Checklist

- [ ] All 3 functions deployed: `supabase functions deploy`
- [ ] Environment variables set in Supabase Dashboard
- [ ] pg_cron jobs configured for scheduled-tasks
- [ ] Brevo API key valid and has balance
- [ ] `email_logs` table created with RLS policies
- [ ] Test email sending works end-to-end
- [ ] Test scheduled tasks run without errors
- [ ] Test librarian creation works
- [ ] Frontend hooks integrated and tested
- [ ] Error monitoring set up (Supabase logs)