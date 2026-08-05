# Supabase Edge Functions Documentation

## Overview

This project uses **3 Supabase Edge Functions** deployed on Deno runtime:

| Function | Path | Purpose |
|----------|------|---------|
| **send-email** | `/functions/v1/send-email` | Send emails via Brevo, process pending queue |
| **scheduled-tasks** | `/functions/v1/scheduled-tasks` | Hourly cron: expire loans, mark overdue, send reminders, process emails |
| **create-librarian** | `/functions/v1/create-librarian` | Admin-only: create librarian accounts with masked domain |

---

## 1. send-email Function

**File:** `supabase/functions/send-email/index.ts`

### Purpose
- Send emails via Brevo API (replaces Arkesel SMS)
- Process pending email queue (GET request)
- Log all attempts to `email_logs` table
- Support for templated emails (borrow confirmation, due reminders, overdue notices, reservation ready, welcome)

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/functions/v1/send-email` | Send single email (with template support) |
| `GET` | `/functions/v1/send-email` | Process all pending emails in queue |

### POST Request

```typescript
// Request body
interface EmailRequest {
  to: string;                    // Email address
  subject?: string;              // Optional if using template
  template?: 'borrow_confirmation' | 'due_reminder' | 'overdue_notice' | 'reservation_ready' | 'welcome' | 'password_reset';
  template_data?: Record<string, string>;  // Data for template
  html?: string;                 // Raw HTML (if not using template)
  text?: string;                 // Plain text fallback
  type?: 'borrow_confirmation' | 'due_reminder' | 'overdue_notice' | 'reservation_ready' | 'welcome' | 'password_reset';
  user_id?: string;              // Optional: associate with user
}

// Response
{
  ok: boolean;
  message: string;
  message_id?: string;
}
```

**Example with Template:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "student@st.knust.edu.gh",
    "template": "borrow_confirmation",
    "template_data": {
      "title": "Introduction to Algorithms",
      "format": "physical",
      "due_date": "2024-01-15",
      "loan_id": "abc-123",
      "user_name": "John Doe"
    }
  }'
```

**Example with Custom HTML:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "student@st.knust.edu.gh",
    "subject": "Test from KNUST Library",
    "html": "<h1>Hello!</h1><p>This is a test email.</p>",
    "type": "welcome"
  }'
```

### GET Request (Process Queue)

```bash
curl -X GET https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ANON_KEY"
```

**Response:**
```json
{
  "ok": true,
  "processed": 5,
  "results": [
    { "id": "uuid", "status": "success", "message_id": "brevo_msg_id" },
    { "id": "uuid", "status": "failed", "error": "Invalid email" }
  ]
}
```

### Email Templates

The function includes built-in templates for:
- `borrow_confirmation` - Book borrowed confirmation
- `due_reminder` - 2 days before due date
- `overdue_notice` - Overdue notice with fine amount
- `reservation_ready` - Reserved book available
- `welcome` - Welcome email for new users
- `password_reset` - Password reset (future use)

### Email Logging

All attempts logged to `email_logs` table:
```sql
create table email_logs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  subject text not null,
  type text not null,
  status text default 'pending',  -- 'pending' | 'sent' | 'failed'
  brevo_response jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz default now()
);
```

---

## 2. scheduled-tasks Function

**File:** `supabase/functions/scheduled-tasks/index.ts`

### Purpose
Runs hourly via pg_cron to:
1. Expire digital loans (past due + 1 day grace)
2. Mark overdue physical loans
3. Send due date reminders (2 days before due) - in-app + email
4. Send overdue email notifications
5. Process pending email queue

### Endpoints

| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| `GET` | `/functions/v1/scheduled-tasks` | `?task=all` | Run all tasks |
| `GET` | `/functions/v1/scheduled-tasks` | `?task=expire_digital` | Expire digital loans only |
| `GET` | `/functions/v1/scheduled-tasks` | `?task=mark_overdue` | Mark overdue loans only |
| `GET` | `/functions/v1/scheduled-tasks` | `?task=due_reminders` | Send due reminders (in-app + email) |
| `GET` | `/functions/v1/scheduled-tasks` | `?task=overdue_email` | Queue overdue emails |
| `GET` | `/functions/v1/scheduled-tasks` | `?task=due_email` | Queue due date email reminders |
| `GET` | `/functions/v1/scheduled-tasks` | `?task=process_email` | Send pending emails via Brevo |

### Task Details

| Task | SQL Function | Description |
|------|--------------|-------------|
| `expire_digital` | `expire_digital_loans()` | Digital loans past due + 1 day → status 'expired', notify next reservation |
| `mark_overdue` | `mark_overdue_loans()` | Active loans past due → status 'overdue' |
| `due_reminders` | `send_due_reminders()` | Loans due in 2 days → in-app notification + queue email |
| `overdue_email` | `send_overdue_email_notifications()` | Overdue loans → queue email with fine amount |
| `due_email` | `send_due_date_email_reminders()` | Loans due in 2 days → queue reminder email |
| `process_email` | N/A (in-function) | Send all pending `email_logs` via Brevo |

### Cron Setup (pg_cron)

```sql
-- Run all tasks hourly at minute 0
SELECT cron.schedule(
  'library-hourly-tasks',
  '0 * * * *',
  $$ SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/scheduled-tasks',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_ANON_KEY'),
    body := '{"task":"all"}'::jsonb
  ) $$
);

-- Or run specific tasks at different intervals
-- Daily at 6 AM: send due reminders
SELECT cron.schedule(
  'library-due-reminders',
  '0 6 * * *',
  $$ SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/scheduled-tasks',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_ANON_KEY'),
    body := '{"task":"due_reminders"}'::jsonb
  ) $$
);

-- Daily at 8 AM: process email queue
SELECT cron.schedule(
  'library-process-email',
  '0 8 * * *',
  $$ SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/scheduled-tasks',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_ANON_KEY'),
    body := '{"task":"process_email"}'::jsonb
  ) $$
);
```

---

## 3. create-librarian Function

**File:** `supabase/functions/create-librarian/index.ts`

### Purpose
Admin-only function to create librarian accounts with masked `@lib.knust.edu.gh` domain.

### Security

- Requires valid **librarian JWT** (Bearer token)
- Verifies caller has `role = 'librarian'` in profile
- Uses `SUPABASE_SERVICE_ROLE_KEY` for admin user creation
- Sets `admin_created: true` flag to bypass self-registration block

### Endpoint

| Method | Path | Auth Required |
|--------|------|---------------|
| `POST` | `/functions/v1/create-librarian` | Librarian JWT |

### Request

```typescript
interface CreateLibrarianRequest {
  username: string;      // e.g., "j.doe" (no @)
  password: string;      // Min 8 characters
  full_name: string;     // e.g., "John Doe"
  department: string;    // e.g., "Computer Science"
}

// Response
{
  ok: boolean;
  message: string;
  email_masked: string;  // "j.doe@•••.knust.edu.gh"
}
```

---

## Deployment

### Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF
```

### Deploy All Functions

```bash
# Deploy all
supabase functions deploy

# Or deploy individually
supabase functions deploy send-email
supabase functions deploy scheduled-tasks
supabase functions deploy create-librarian
```

### Set Environment Variables

In **Supabase Dashboard → Edge Functions → Environment Variables**:

```env
# send-email
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@knust.edu.gh
BREVO_SENDER_NAME=KNUST Library

# scheduled-tasks
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# create-librarian
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Verify Deployment

```bash
# Test send-email
curl -X POST https://your-project.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@st.knust.edu.gh", "template": "welcome", "template_data": {"user_name": "Test User", "email": "test@st.knust.edu.gh", "role": "Student", "max_loans": "2", "loan_period": "14"}}'

# Test scheduled-tasks
curl "https://your-project.supabase.co/functions/v1/scheduled-tasks?task=all" \
  -H "Authorization: Bearer $ANON_KEY"

# Test create-librarian (requires librarian login first)
# 1. Login as librarian in browser
# 2. Get token from localStorage
# 3. Use token in Authorization header
```

---

## Monitoring & Debugging

### View Function Logs

```bash
# Supabase CLI
supabase functions logs send-email --follow

# Or in Dashboard: Edge Functions → Logs
```

### Check Email Logs in Database

```sql
-- View recent email attempts
select * from email_logs 
order by created_at desc 
limit 20;

-- Check failed messages
select * from email_logs 
where status = 'failed' 
order by created_at desc;

-- Email by type
select type, status, count(*) 
from email_logs 
group by type, status;
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `BREVO_API_KEY not configured` | Add to Edge Function env vars |
| `service_role key not found` | Add `SUPABASE_SERVICE_ROLE_KEY` to env vars |
| `401 Unauthorized` | Check JWT is valid librarian token |
| `403 Forbidden` | Caller is not a librarian |
| Email not sending | Check Brevo balance, email format, API key |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE EDGE FUNCTIONS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │  send-email  │    │  scheduled-tasks │    │ create-librarian│
│  │              │    │                  │    │               │  │
│  │ POST: send   │    │ GET: task=all    │    │ POST: create  │
│  │ GET: process │    │ GET: task=xxx    │    │               │  │
│  └──────┬───────┘    └────────┬─────────┘    └───────┬───────┘  │
│         │                     │                      │          │
│         ▼                     ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    BREVO EMAIL API                        │  │
│  │  https://api.brevo.com/v3/smtp/email                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                     │                      │          │
│         ▼                     ▼                      ▼          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    SUPABASE DATABASE                       │  │
│  │  • email_logs (audit trail)                               │  │
│  │  • profiles (email, role)                                 │  │
│  │  • loans, reservations, fines                             │  │
│  │  • notifications (in-app)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Function | URL Pattern | Auth | Key Env Vars |
|----------|-------------|------|--------------|
| `send-email` | `/functions/v1/send-email` | Anon/Librarian | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` |
| `scheduled-tasks` | `/functions/v1/scheduled-tasks?task=all` | Anon | `SUPABASE_SERVICE_ROLE_KEY` |
| `create-librarian` | `/functions/v1/create-librarian` | Librarian JWT | `SUPABASE_SERVICE_ROLE_KEY` |

---

## Testing Checklist

- [ ] `send-email` POST sends single email with template
- [ ] `send-email` GET processes pending queue
- [ ] `scheduled-tasks?task=all` runs all subtasks
- [ ] `scheduled-tasks?task=process_email` sends pending emails
- [ ] `create-librarian` creates account with masked email
- [ ] Cron jobs run hourly/daily as configured
- [ ] Email logs appear in `email_logs` table
- [ ] Failed emails are retried on next `process_email` run
- [ ] Templates render correctly (HTML and text)