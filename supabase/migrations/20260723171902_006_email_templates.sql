-- Email Template Helper Functions
-- These are called by the email notification functions

-- Borrow Confirmation Email HTML
create or replace function get_borrow_confirmation_email_html(p_title text, p_format text, p_due_date timestamptz, p_loan_id uuid, p_user_name text)
returns text language sql as $body$
  select format($$
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f766e 0%%, #0d9488 100%%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 Book Borrowed Successfully</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; color: #374151;">Hi %s,</p>
        <p style="font-size: 16px; color: #374151;">You have successfully borrowed <strong style="color: #0f766e;">%s</strong> (%s).</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Format:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Loan ID:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">%s</td></tr>
          </table>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>⏰ Reminder:</strong> Please return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and manage your account at the <a href="%s/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
      </div>
    </body>
    </html>
  $$, COALESCE(p_user_name, 'Student'), p_title, p_format, p_title, p_format, to_char(p_due_date, 'YYYY-MM-DD'), p_loan_id::text, app_url)
  from (select 'https://library.knust.edu.gh'::text as app_url) u;
$body$;

-- Borrow Confirmation Email Text
create or replace function get_borrow_confirmation_email_text(p_title text, p_format text, p_due_date timestamptz, p_loan_id uuid, p_user_name text)
returns text language sql as $body$
  select format($$
    Book Borrowed: %s

    Hi %s,

    You have successfully borrowed "%s" (%s).
    Due Date: %s
    Loan ID: %s

    Please return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.

    View your loans at: %s/dashboard

    KNUST Library Management System
  $$, p_title, COALESCE(p_user_name, 'Student'), p_title, p_format, to_char(p_due_date, 'YYYY-MM-DD'), p_loan_id::text, 'https://library.knust.edu.gh');
$body$;

-- Due Reminder Email HTML
create or replace function get_due_reminder_email_html(p_title text, p_user_name text, p_due_date timestamptz, p_loan_id uuid)
returns text language sql as $body$
  select format($$
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%%, #f97316 100%%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Due Date Reminder</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; color: #374151;">Hi %s,</p>
        <p style="font-size: 16px; color: #374151;">This is a friendly reminder that <strong style="color: #f59e0b;">%s</strong> is due on <strong style="color: #dc2626;">%s</strong>.</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Loan ID:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">%s</td></tr>
          </table>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> Please return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and manage your account at the <a href="%s/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
      </div>
    </body>
    </html>
  $$, COALESCE(p_user_name, 'Student'), p_title, to_char(p_due_date, 'YYYY-MM-DD'), p_title, to_char(p_due_date, 'YYYY-MM-DD'), p_loan_id::text, app_url)
  from (select 'https://library.knust.edu.gh'::text as app_url) u;
$body$;

-- Due Reminder Email Text
create or replace function get_due_reminder_email_text(p_title text, p_user_name text, p_due_date timestamptz, p_loan_id uuid)
returns text language sql as $body$
  select format($$
    Due Date Reminder: "%s"

    Hi %s,

    This is a reminder that "%s" is due on %s.
    Loan ID: %s

    Please return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.

    View your loans at: %s/dashboard

    KNUST Library Management System
  $$, p_title, COALESCE(p_user_name, 'Student'), p_title, to_char(p_due_date, 'YYYY-MM-DD'), p_loan_id::text, 'https://library.knust.edu.gh');
$body$;

-- Overdue Notice Email HTML
create or replace function get_overdue_email_html(p_title text, p_user_name text, p_due_date timestamptz, p_days_overdue int, p_fine_amount numeric, p_loan_id uuid)
returns text language sql as $body$
  select format($$
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626 0%%, #ef4444 100%%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚨 OVERDUE NOTICE</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; color: #374151;">Hi %s,</p>
        <p style="font-size: 16px; color: #374151;">The book <strong style="color: #dc2626;">%s</strong> was due on <strong>%s</strong> and is now <strong style="color: #dc2626;">%s days overdue</strong>.</p>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Due Date:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Days Overdue:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">%s days</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Current Fine:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">GHS %s/day</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Loan ID:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">%s</td></tr>
          </table>
        </div>
        
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>⚠️ Action Required:</strong> Please return the book immediately to the KNUST Library to stop further fines from accumulating. Current fine rate: GHS 5 per day for physical books.</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and fines at the <a href="%s/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
      </div>
    </body>
    </html>
  $$, COALESCE(p_user_name, 'Student'), p_title, to_char(p_due_date, 'YYYY-MM-DD'), p_days_overdue, p_title, to_char(p_due_date, 'YYYY-MM-DD'), p_days_overdue, p_fine_amount, p_loan_id::text, app_url)
  from (select 'https://library.knust.edu.gh'::text as app_url) u;
$body$;

-- Overdue Notice Email Text
create or replace function get_overdue_email_text(p_title text, p_user_name text, p_due_date timestamptz, p_days_overdue int, p_fine_amount numeric, p_loan_id uuid)
returns text language sql as $body$
  select format($$
    OVERDUE NOTICE: "%s"

    Hi %s,

    The book "%s" was due on %s (%s days overdue).
    Current Fine: GHS %s/day
    Loan ID: %s

    Please return the book immediately to the KNUST Library to stop further fines from accumulating. Fine rate: GHS 5 per day for physical books.

    View your loans at: %s/dashboard

    KNUST Library Management System
  $$, p_title, COALESCE(p_user_name, 'Student'), p_title, to_char(p_due_date, 'YYYY-MM-DD'), p_days_overdue, p_fine_amount, p_loan_id::text, 'https://library.knust.edu.gh');
$body$;

-- Reservation Ready Email HTML
create or replace function get_reservation_ready_email_html(p_title text, p_format text, p_claim_expires_at timestamptz, p_user_name text)
returns text language sql as $body$
  select format($$
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f766e 0%%, #0d9488 100%%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Reservation Ready</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; color: #374151;">Hi %s,</p>
        <p style="font-size: 16px; color: #374151;">Great news! The book <strong style="color: #0f766e;">%s</strong> you reserved is now available for pickup.</p>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Book:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Format Available:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">%s</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Claim Expires:</td><td style="padding: 8px 0; font-weight: 600; color: #dc2626;">%s</td></tr>
          </table>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #166534;"><strong>⏰ Claim Window:</strong> You have 48 hours to claim this reservation. After that, it will be offered to the next person in the queue.</p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Claim your reservation at the <a href="%s/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a> or visit the library counter.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
      </div>
    </body>
    </html>
  $$, COALESCE(p_user_name, 'Student'), p_title, p_title, p_format, to_char(p_claim_expires_at, 'YYYY-MM-DD HH24:MI'), app_url)
  from (select 'https://library.knust.edu.gh'::text as app_url) u;
$body$;

-- Reservation Ready Email Text
create or replace function get_reservation_ready_email_text(p_title text, p_format text, p_claim_expires_at timestamptz, p_user_name text)
returns text language sql as $body$
  select format($$
    Reservation Ready: "%s"

    Hi %s,

    The book "%s" you reserved is now available for pickup (%s).
    Claim by: %s

    You have 48 hours to claim this reservation before it expires and is offered to the next person in the queue.

    Claim at: %s/dashboard

    KNUST Library Management System
  $$, p_title, COALESCE(p_user_name, 'Student'), p_title, p_format, to_char(p_claim_expires_at, 'YYYY-MM-DD HH24:MI'), 'https://library.knust.edu.gh');
$body$;