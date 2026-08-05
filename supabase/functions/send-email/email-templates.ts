export function getEmailTemplate(type: string, data: Record<string, string>): { subject: string; html: string; text: string } {
  const baseUrl = Deno.env.get("APP_URL") || "https://library.knust.edu.gh";
  
  const templates: Record<string, (data: Record<string, string>) => { subject: string; html: string; text: string }> = {
    borrow_confirmation: (data) => ({
      subject: `Book Borrowed: ${data.title}`,
      html: `<!DOCTYPE html>
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
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and manage your account at the <a href="${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
  </div>
</body>
</html>`,
      text: `Book Borrowed: ${data.title}\n\nHi ${data.user_name || 'Student'},\n\nYou have successfully borrowed "${data.title}" (${data.format}).\nDue Date: ${data.due_date}\nLoan ID: ${data.loan_id}\n\nPlease return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.\n\nView your loans at: ${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard\n\nKNUST Library Management System`
    }),
    due_reminder: (data) => ({
      subject: `Reminder: "${data.title}" is due ${data.due_date}`,
      html: `<!DOCTYPE html>
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
        <tr><td style="padding: 8px 0; color: #6b7280;">Format:</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${data.format}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Loan ID:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">${data.loan_id}</td></tr>
      </table>
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> Please return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.</p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and manage your account at the <a href="${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
  </div>
</body>
</html>`,
      text: `Due Date Reminder: "${data.title}"\n\nHi ${data.user_name || 'Student'},\n\nThis is a reminder that "${data.title}" is due on ${data.due_date}.\nLoan ID: ${data.loan_id}\n\nPlease return the book by the due date to avoid fines (GHS 5/day for physical books). Digital loans auto-expire after the due date + 1 day grace period.\n\nView your loans at: ${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard\n\nKNUST Library Management System`
    }),
    overdue_notice: (data) => ({
      subject: `OVERDUE: "${data.title}" - ${data.days_overdue} days overdue`,
      html: `<!DOCTYPE html>
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
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">You can view your loans and fines at the <a href="${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a>.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
  </div>
</body>
</html>`,
      text: `OVERDUE NOTICE: "${data.title}"\n\nHi ${data.user_name || 'Student'},\n\nThe book "${data.title}" was due on ${data.due_date} and is now ${data.days_overdue} days overdue.\nCurrent Fine: GHS ${data.fine_amount || data.days_overdue * 5}/day\nLoan ID: ${data.loan_id}\n\nPlease return the book immediately to the KNUST Library to stop further fines from accumulating. Fine rate: GHS 5 per day for physical books.\n\nView your loans at: ${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard\n\nKNUST Library Management System`
    }),
    reservation_ready: (data) => ({
      subject: `Reservation Ready: "${data.title}" is available`,
      html: `<!DOCTYPE html>
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
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Claim your reservation at the <a href="${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard" style="color: #0f766e; text-decoration: none;">Library Dashboard</a> or visit the library counter.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
  </div>
</body>
</html>`,
      text: `Reservation Ready: "${data.title}"\n\nHi ${data.user_name || 'Student'},\n\nThe book "${data.title}" you reserved is now available for pickup (${data.format}).\nClaim by: ${data.claim_expires_at}\n\nYou have 48 hours to claim this reservation before it expires and is offered to the next person in the queue.\n\nClaim at: ${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard\n\nKNUST Library Management System`
    }),
    welcome: (data) => ({
      subject: "Welcome to KNUST Library Management System",
      html: `<!DOCTYPE html>
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
      <a href="${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard" style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Go to Dashboard</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center;">KNUST Library Management System<br>Kwame Nkrumah University of Science and Technology</p>
  </div>
</body>
</html>`,
      text: `Welcome to KNUST Library!\n\nHi ${data.user_name || 'Student'},\n\nWelcome to the KNUST Library Management System! Your account has been created successfully.\n\nAccount Details:\n- Name: ${data.user_name}\n- Email: ${data.email}\n- Role: ${data.role}\n- Max Loans: ${data.max_loans} books\n- Loan Period: ${data.loan_period} days\n\nGet started at: ${Deno.env.get('APP_URL') || 'https://library.knust.edu.gh'}/dashboard\n\nKNUST Library Management System`
    }),
  };

  return templates[type]?.(data) || {
    subject: "KNUST Library Notification",
    html: `<p>${JSON.stringify(data)}</p>`,
    text: JSON.stringify(data),
  };
}