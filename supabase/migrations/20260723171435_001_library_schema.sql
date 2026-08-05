/*
# KNUST Library Management System — Core Schema

## Overview
Creates the complete data model for an automated hybrid (physical + digital)
library management system for KNUST, enforcing role-based loan limits,
loan periods, overdue fines, and email-domain validation.

## 1. New Tables

### profiles
Extends `auth.users`. One row per library member.
- `id` — links to auth.users.id (cascade delete)
- `role` — 'student' | 'postgrad' | 'staff' | 'librarian'
- `email`, `full_name`, `department`
- `max_loans` — 3 (student), 6 (postgrad), 10 (staff), NULL (librarian)
- `loan_period_days` — 14 (student/postgrad), 30 (staff)
- `fine_balance` — running total of unpaid physical-loan fines (GHS)

### books
Hybrid catalogue. A book can be physical, digital, or both.
- `isbn` (unique), `title`, `author`, `description`, `cover_url`, `category`, `shelf_location`
- `type` — 'physical' | 'digital' | 'both'
- `total_physical` / `available_physical` — copy counters
- `total_digital` / `available_digital` — licence counters
- `digital_url` — access link revealed only to active digital borrowers

### loans
- `user_id`, `book_id`
- `format` — 'physical' | 'digital'
- `borrowed_date`, `due_date`, `returned_date`
- `status` — 'active' | 'returned' | 'overdue' | 'expired'
- `renewed` — boolean, renew allowed once
- `expired_at` — set when digital loan auto-expires

### fines
Physical overdue fines only. GHS 5/day.
- `user_id`, `loan_id`, `amount`, `paid`, `waived`, `created_at`

### reservations
Single FIFO queue per book, any format.
- `user_id`, `book_id`, `queue_position`, `status`
  ('waiting' | 'notified' | 'fulfilled' | 'expired')
- `format_offered`, `notified_at`, `claim_expires_at`

### notifications
In-app notifications for due reminders and reservation availability.
- `user_id`, `type`, `message`, `read`, `link`, `created_at`

### faq_embeddings
RAG knowledge base for the AI chatbot (pgvector).
- `question`, `answer`, `embedding` (vector 1536)

## 2. Security
- RLS enabled on every table.
- Owner-scoped CRUD for profiles, loans, fines, reservations, notifications.
- Catalogue (books) is readable by all authenticated users; only librarians write.
- FAQ readable by all authenticated users.

## 3. Triggers / Functions
- `handle_new_user()` — AFTER INSERT on auth.users: validates the email domain
  against the requested role, derives max_loans + loan_period_days, and inserts
  the matching profile row. Rejects sign-up if the domain does not match the role
  or if a librarian tries to self-register.
- `updated_at` maintenance on profiles.

## 4. Important Notes
- pgvector extension enabled for chatbot embeddings.
- All counters (available_physical/digital) are managed exclusively by
  SECURITY DEFINER RPCs in a later migration — direct client writes to
  counters are blocked by RLS.
*/

-- ── Extensions ─────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists vector;

-- ── Profiles ───────────────────────────────────────────────
create table if not exists profiles (
  id               uuid primary key references auth.users on delete cascade,
  role             text check (role in ('student','postgrad','staff','librarian')) not null,
  email            text unique not null,
  full_name        text,
  department       text,
  max_loans        int,
  loan_period_days int,
  fine_balance     numeric default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select
  to authenticated using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Librarians can read all profiles (needed to manage members)
drop policy if exists "profiles_select_librarian" on profiles;
create policy "profiles_select_librarian" on profiles for select
  to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

-- ── Books ──────────────────────────────────────────────────
create table if not exists books (
  id                 uuid primary key default gen_random_uuid(),
  isbn               text unique,
  title              text not null,
  author             text,
  description        text,
  cover_url          text,
  category           text,
  type               text check (type in ('physical','digital','both')) not null,
  total_physical     int default 0,
  available_physical int default 0,
  total_digital      int default 0,
  available_digital  int default 0,
  digital_url        text,
  shelf_location     text,
  created_at         timestamptz default now()
);

alter table books enable row level security;

-- Everyone authenticated can read the catalogue.
-- The digital_url is intentionally exposed via RLS SELECT; the UI gates display
-- to users with an active digital loan (enforced in the borrow RPC + frontend).
drop policy if exists "books_select_all" on books;
create policy "books_select_all" on books for select
  to authenticated using (true);

-- Only librarians can create / update / delete books.
drop policy if exists "books_insert_librarian" on books;
create policy "books_insert_librarian" on books for insert
  to authenticated with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

drop policy if exists "books_update_librarian" on books;
create policy "books_update_librarian" on books for update
  to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

drop policy if exists "books_delete_librarian" on books;
create policy "books_delete_librarian" on books for delete
  to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

-- ── Loans ──────────────────────────────────────────────────
create table if not exists loans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  book_id       uuid not null references books(id) on delete restrict,
  format        text check (format in ('physical','digital')) not null,
  borrowed_date timestamptz default now(),
  due_date      timestamptz not null,
  returned_date timestamptz,
  status        text check (status in ('active','returned','overdue','expired')) default 'active',
  renewed       boolean default false,
  expired_at    timestamptz,
  created_at    timestamptz default now()
);

create index if not exists idx_loans_user on loans(user_id);
create index if not exists idx_loans_book on loans(book_id);
create index if not exists idx_loans_status on loans(status);
create index if not exists idx_loans_due on loans(due_date);

alter table loans enable row level security;

drop policy if exists "loans_select_own_or_librarian" on loans;
create policy "loans_select_own_or_librarian" on loans for select
  to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

-- Insert/update/delete are performed by SECURITY DEFINER RPCs (service role),
-- so we do not grant direct client DML on loans.

-- ── Fines ──────────────────────────────────────────────────
create table if not exists fines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  loan_id    uuid references loans(id) on delete set null,
  amount     numeric not null,
  paid       boolean default false,
  waived     boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_fines_user on fines(user_id);

alter table fines enable row level security;

drop policy if exists "fines_select_own_or_librarian" on fines;
create policy "fines_select_own_or_librarian" on fines for select
  to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

-- ── Reservations ───────────────────────────────────────────
create table if not exists reservations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  book_id          uuid not null references books(id) on delete restrict,
  queue_position   int,
  status           text check (status in ('waiting','notified','fulfilled','expired')) default 'waiting',
  format_offered   text check (format_offered in ('physical','digital')),
  notified_at      timestamptz,
  claim_expires_at timestamptz,
  fulfilled_loan_id uuid references loans(id) on delete set null,
  created_at       timestamptz default now()
);

create index if not exists idx_res_book on reservations(book_id, status);
create index if not exists idx_res_user on reservations(user_id);

alter table reservations enable row level security;

drop policy if exists "res_select_own_or_librarian" on reservations;
create policy "res_select_own_or_librarian" on reservations for select
  to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'librarian')
  );

-- ── Notifications ──────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,
  message    text not null,
  read       boolean default false,
  link       text,
  created_at timestamptz default now()
);

create index if not exists idx_notif_user on notifications(user_id, read);

alter table notifications enable row level security;

drop policy if exists "notif_select_own" on notifications;
create policy "notif_select_own" on notifications for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "notif_update_own" on notifications;
create policy "notif_update_own" on notifications for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notif_delete_own" on notifications;
create policy "notif_delete_own" on notifications for delete
  to authenticated using (user_id = auth.uid());

-- ── FAQ embeddings ─────────────────────────────────────────
create table if not exists faq_embeddings (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  embedding  vector(1536)
);

alter table faq_embeddings enable row level security;

drop policy if exists "faq_select_all" on faq_embeddings;
create policy "faq_select_all" on faq_embeddings for select
  to authenticated using (true);

-- ── updated_at trigger on profiles ─────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

-- ── Email-domain validation + profile creation ─────────────
-- Derives role config from the email domain and the role chosen at sign-up
-- (passed via user_metadata). Librarian self-registration is blocked; librarian
-- accounts are created only through the create-librarian edge function.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email     text := lower(trim(new.email));
  v_domain    text;
  v_role      text := coalesce(new.raw_user_meta_data->>'role', '');
  v_max       int;
  v_period    int;
  v_count     int;
begin
  -- Extract domain after '@'
  v_domain := substring(v_email from position('@' in v_email) + 1);

  -- Validate domain <-> role mapping
  if v_domain = 'st.knust.edu.gh' then
    if v_role not in ('student','postgrad') then
      raise exception 'KNUST student/postgrad accounts must use @st.knust.edu.gh';
    end if;
    v_max    := case when v_role = 'student' then 3 else 6 end;
    v_period := 14;
  elsif v_domain = 'stf.knust.edu.gh' then
    if v_role <> 'staff' then
      raise exception 'KNUST staff accounts must use @stf.knust.edu.gh';
    end if;
    v_role := 'staff';
    v_max  := 10;
    v_period := 30;
  elsif v_domain = 'lib.knust.edu.gh' then
    -- Librarian self-registration is disabled. Only the service-role edge
    -- function may create librarian accounts (it sets raw_app_meta_data->>'role'
    -- to 'librarian' AND the flag 'admin_created' = 'true').
    if (new.raw_app_meta_data->>'admin_created') is distinct from 'true' then
      raise exception 'Librarian accounts cannot be self-registered. Contact an existing librarian.';
    end if;
    v_role := 'librarian';
    v_max  := null;
    v_period := null;
  else
    raise exception 'Email must use an approved KNUST domain (@st.knust.edu.gh, @stf.knust.edu.gh, @lib.knust.edu.gh)';
  end if;

  -- Block duplicate profiles
  select count(*) into v_count from profiles where id = new.id;
  if v_count = 0 then
    insert into profiles (id, role, email, full_name, department, max_loans, loan_period_days)
    values (
      new.id,
      v_role,
      v_email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'department', ''),
      v_max,
      v_period
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row execute function handle_new_user();
