/*
# KNUST Library — Student max active loans: 2 -> 3

## Why
commit f4da713 documented students can hold 3 active loans (README), but the
business rule was never changed in the database. The handle_new_user trigger
still set max_loans = 2 for students, existing student profiles still held 2,
and borrow_book() (which enforces `v_active >= v_user.max_loans`) still blocked
a 3rd loan. This migration makes the live database match the documented rule.

## Changes
1. Update every existing student profile: max_loans 2 -> 3.
   borrow_book()/reserve_book() read max_loans from the profile, so this lifts
   the limit immediately for all current students.
2. Recreate handle_new_user() so newly registered students are created with
   max_loans = 3. (The trigger itself, trg_handle_new_user, already calls this
   function by name, so it does not need to be recreated.)
*/

-- 1. Lift the limit for existing students
update profiles
   set max_loans = 3
 where role = 'student'
   and (max_loans is distinct from 3);

-- 2. Recreate the signup trigger function with the new student limit
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
    -- function may create librarian accounts (admin_created flag).
    if (new.raw_app_meta_data->>'admin_created') is distinct from 'true' then
      raise exception 'Librarian accounts cannot be self-registered. Contact an existing librarian.';
    end if;
    v_role := 'librarian';
    v_max  := null;
    v_period := null;
  else
    raise exception 'Email must use an approved KNUST domain (@st.knust.edu.gh, @stf.knust.edu.gh, @lib.knust.edu.gh)';
  end if;

  -- Avoid duplicate profile rows
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

-- The existing trigger keeps calling handle_new_user(); no trigger change needed.

-- 3. Keep the chatbot FAQ answers in sync (the seed uses ON CONFLICT DO NOTHING,
--    so re-running it would not refresh rows that already exist).
update faq_embeddings
   set answer = 'Students can have up to 3 active loans. Post-graduate students can have up to 6 active loans. Staff can have up to 10 active loans. The limit counts any mix of physical and digital loans.'
 where question = 'How many books can I borrow at once?';

update faq_embeddings
   set answer = 'Student: 14 days, 3 books max. Post-graduate: 14 days, 6 books max. Staff: 30 days, 10 books max. All roles pay GHS 5 per day for late physical returns.'
 where question = 'What are the KNUST library loan periods by role?';

-- Verification (run manually in the SQL editor to audit):
-- select role, max_loans, count(*) from profiles group by role, max_loans order by role;
