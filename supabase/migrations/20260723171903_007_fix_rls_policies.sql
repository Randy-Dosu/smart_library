-- Fix infinite recursion in RLS policies
-- The original policies query the profiles table from within profiles policies,
-- causing infinite recursion. Fixed by using auth.jwt() to check roles.

-- ── Fix profiles_select_librarian policy ──
drop policy if exists "profiles_select_librarian" on profiles;
create policy "profiles_select_librarian" on profiles for select
  to authenticated using (
    (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  );

-- ── Fix books policies ──
drop policy if exists "books_insert_librarian" on books;
create policy "books_insert_librarian" on books for insert
  to authenticated
  with check (
    (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  );

drop policy if exists "books_update_librarian" on books;
create policy "books_update_librarian" on books for update
  to authenticated
  using (
    (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  )
  with check (
    (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  );

drop policy if exists "books_delete_librarian" on books;
create policy "books_delete_librarian" on books for delete
  to authenticated
  using (
    (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  );

-- ── Fix loans policies ──
drop policy if exists "loans_select_own_or_librarian" on loans;
create policy "loans_select_own_or_librarian" on loans for select
  to authenticated using (
    user_id = auth.uid()
    or (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  );

-- ── Fix fines policies ──
drop policy if exists "fines_select_own_or_librarian" on fines;
create policy "fines_select_own_or_librarian" on fines for select
  to authenticated using (
    user_id = auth.uid()
    or (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  );

-- ── Fix reservations policies ──
drop policy if exists "res_select_own_or_librarian" on reservations;
create policy "res_select_own_or_librarian" on reservations for select
  to authenticated using (
    user_id = auth.uid()
    or (auth.jwt() ->> 'role') = 'librarian'
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'librarian'
  );

-- ── Fix notifications policies ──
drop policy if exists "notif_select_own" on notifications;
create policy "notif_select_own" on notifications for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "notif_update_own" on notifications;
create policy "notif_update_own" on notifications for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notif_delete_own" on notifications;
create policy "notif_delete_own" on notifications for delete
  to authenticated using (user_id = auth.uid());
