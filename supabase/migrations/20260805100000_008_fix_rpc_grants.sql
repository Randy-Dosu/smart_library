/*
# KNUST Library — Fix missing RPC EXECUTE grants

## Problem
Migration 002 only granted EXECUTE on five of the twelve business-logic RPCs:
  borrow_book, return_book, renew_loan, reserve_book, send_due_reminders.

The remaining seven were created but never granted:
  get_user_stats, get_librarian_analytics, pay_fine, waive_fine,
  claim_reservation, expire_digital_loans, mark_overdue_loans.

On a default Supabase project these still work, because new functions inherit
EXECUTE from PUBLIC automatically. But the moment the recommended hardening
(`revoke execute on function ... from public`) is applied — or Supabase tightens
the default — the member dashboard (get_user_stats, pay_fine, claim_reservation)
and the librarian dashboard (get_librarian_analytics, waive_fine) break with
  ERROR: permission denied for function <name>.

This also made the grants inconsistent with the five that WERE granted.

## Fix
Grant EXECUTE explicitly on every client-callable RPC to `authenticated`, and on
the scheduled-job targets to `authenticated, anon`. These statements are
idempotent and safe to re-run. (002 has been corrected to grant these as well, so
fresh deploys are correct; this migration repairs projects that already ran the
original 002.)
*/

-- Client-callable RPCs
grant execute on function borrow_book(uuid, text) to authenticated;
grant execute on function return_book(uuid) to authenticated;
grant execute on function renew_loan(uuid) to authenticated;
grant execute on function reserve_book(uuid, text) to authenticated;
grant execute on function claim_reservation(uuid) to authenticated;
grant execute on function pay_fine(uuid) to authenticated;
grant execute on function waive_fine(uuid) to authenticated;
grant execute on function get_user_stats(uuid) to authenticated;
grant execute on function get_librarian_analytics() to authenticated;

-- Scheduled-job targets (called by the scheduled-tasks edge function via the
-- service-role key, but granted here too so they survive any future PUBLIC
-- EXECUTE revocation).
grant execute on function expire_digital_loans() to authenticated, anon;
grant execute on function mark_overdue_loans() to authenticated, anon;

-- Verification: confirm each business-logic function is callable by the
-- intended roles. (Commented out so the migration stays side-effect free —
-- run manually in the SQL editor to audit.)
--
-- select proname,
--        has_function_privilege('authenticated', oid, 'execute') as authenticated_can_execute,
--        has_function_privilege('anon',          oid, 'execute') as anon_can_execute
-- from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('borrow_book','return_book','renew_loan','reserve_book',
--        'claim_reservation','pay_fine','waive_fine','get_user_stats',
--        'get_librarian_analytics','expire_digital_loans','mark_overdue_loans');
-- Expected: authenticated_can_execute = true for all of them.
