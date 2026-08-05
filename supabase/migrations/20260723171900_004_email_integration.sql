-- Email Logs Table
create table if not exists email_logs (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  subject         text not null,
  type            text not null,
  status          text default 'pending',
  html            text,
  "text"          text,
  brevo_response  jsonb,
  error_message   text,
  sent_at         timestamptz,
  created_at      timestamptz default now()
);

create index if not exists idx_email_logs_email on email_logs(email);
create index if not exists idx_email_logs_type on email_logs(type);
create index if not exists idx_email_logs_status on email_logs(status);
create index if not exists idx_email_logs_created on email_logs(created_at);

alter table email_logs enable row level security;

-- Librarians can view all email logs
drop policy if exists "email_logs_select_librarian" on email_logs;
create policy "email_logs_select_librarian" on email_logs for select
  to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

-- Users can view their own email logs
drop policy if exists "email_logs_select_own" on email_logs;
create policy "email_logs_select_own" on email_logs for select
  to authenticated using (email = (select email from profiles where id = auth.uid()));

-- Grant access to edge functions
grant select, insert on email_logs to anon, authenticated;