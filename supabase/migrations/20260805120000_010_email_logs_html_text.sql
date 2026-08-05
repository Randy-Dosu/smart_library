-- Add missing html/text columns to email_logs (idempotent)
alter table email_logs add column if not exists html text;
alter table email_logs add column if not exists "text" text;
