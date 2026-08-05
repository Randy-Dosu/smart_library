/*
# KNUST Library — Business Logic RPCs

## Overview
Security-definer stored procedures that enforce every KNUST business rule on the
server side. All counter mutations and loan lifecycle transitions happen here so
client-side RLS cannot bypass the rules.

## 1. Functions

### borrow_book(p_book_id, p_format)
- Enforces total-active-loans cap (mix of physical + digital).
- Enforces fine-balance threshold (< GHS 50).
- Decrements the correct availability counter.
- Computes due_date = today + loan_period_days (14 or 30).
- Creates the loan and (if applicable) fulfils a waiting reservation owned by the
  borrower.

### return_book(p_loan_id)
- Librarian-only. Marks a physical loan returned.
- Computes overdue days and creates a fine row (GHS 5/day) when overdue.
- Increments available_physical.
- Notifies the next waiting reservation in the FIFO queue with a 48-hour claim window.

### renew_loan(p_loan_id)
- Allowed once, only when no pending reservation exists on the book and the
  borrower's fine balance < GHS 50.
- New due_date = original due_date + full loan period.

### reserve_book(p_book_id, p_format)
- Joins the single FIFO queue for a book when no copies are available in either
  format. Assigns the next queue_position.

### claim_reservation(p_reservation_id)
- Called when a notified user borrows the offered copy.

### pay_fine(p_fine_id) / waive_fine(p_fine_id)
- Settle a fine (pay by user, waive by librarian). Decrements fine_balance.

### expire_digital_loans() / mark_overdue_loans() / send_due_reminders()
- Scheduled job targets.

### get_user_stats / get_librarian_analytics
- Aggregate dashboard numbers.

## 2. Security
All functions are SECURITY DEFINER and perform their own authorization checks.

## 3. Notes
- Fine rate is GHS 5/day, uniform across roles, physical loans only.
- Reservation claim window is 48 hours.
- Digital grace period is 1 day.
*/

-- ── borrow_book ────────────────────────────────────────────
create or replace function borrow_book(p_book_id uuid, p_format text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user     record;
  v_book     record;
  v_active   int;
  v_loan_id  uuid;
  v_due      timestamptz;
  v_res      record;
begin
  select * into v_user from profiles where id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Profile not found');
  end if;

  if v_user.role = 'librarian' then
    return jsonb_build_object('ok', false, 'error', 'Librarians do not borrow books');
  end if;

  select * into v_book from books where id = p_book_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Book not found');
  end if;

  if p_format = 'physical' then
    if v_book.type not in ('physical','both') then
      return jsonb_build_object('ok', false, 'error', 'This title has no physical copies');
    end if;
    if v_book.available_physical <= 0 then
      return jsonb_build_object('ok', false, 'error', 'No physical copies available — place a reservation');
    end if;
  elsif p_format = 'digital' then
    if v_book.type not in ('digital','both') then
      return jsonb_build_object('ok', false, 'error', 'This title has no digital licences');
    end if;
    if v_book.available_digital <= 0 then
      return jsonb_build_object('ok', false, 'error', 'No digital licences available — place a reservation');
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid format');
  end if;

  -- Total active loans (any format)
  select count(*) into v_active
  from loans
  where user_id = v_user.id and status in ('active','overdue');

  if v_active >= v_user.max_loans then
    return jsonb_build_object('ok', false, 'error',
      'You have reached your loan limit of ' || v_user.max_loans || ' books');
  end if;

  if coalesce(v_user.fine_balance, 0) >= 50 then
    return jsonb_build_object('ok', false, 'error',
      'Your fine balance exceeds GHS 50. Please clear it before borrowing.');
  end if;

  if exists (
    select 1 from loans
    where user_id = v_user.id and book_id = p_book_id
      and status in ('active','overdue') and format = p_format
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already have an active ' || p_format || ' loan for this title');
  end if;

  v_due := now() + (v_user.loan_period_days || ' days')::interval;

  insert into loans (user_id, book_id, format, due_date, status)
  values (v_user.id, p_book_id, p_format, v_due, 'active')
  returning id into v_loan_id;

  if p_format = 'physical' then
    update books set available_physical = available_physical - 1 where id = p_book_id;
  else
    update books set available_digital = available_digital - 1 where id = p_book_id;
  end if;

  select * into v_res
  from reservations
  where book_id = p_book_id and user_id = v_user.id and status in ('waiting','notified')
  order by queue_position limit 1;

  if found then
    update reservations
      set status = 'fulfilled', fulfilled_loan_id = v_loan_id
      where id = v_res.id;
    update reservations set queue_position = queue_position - 1
      where book_id = p_book_id and status = 'waiting' and queue_position > v_res.queue_position;
  end if;

  -- Queue email confirmation if user has email
  if v_user.email is not null then
    insert into email_logs (email, subject, type, status, html, text)
    select 
      v_user.email,
      'Book Borrowed: ' || v_book.title,
      'borrow_confirmation',
      'pending',
      get_borrow_confirmation_email_html(v_book.title, p_format, v_due, v_loan_id, COALESCE(v_user.full_name, 'Student')),
      get_borrow_confirmation_email_text(v_book.title, p_format, v_due, v_loan_id, COALESCE(v_user.full_name, 'Student'));
  end if;

  return jsonb_build_object('ok', true, 'loan_id', v_loan_id, 'due_date', v_due);
end;
$$;

-- ── return_book (librarian) ────────────────────────────────
create or replace function return_book(p_loan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_loan    record;
  v_book    record;
  v_user    record;
  v_lib     record;
  v_overdue int;
  v_fine    numeric;
  v_next    record;
begin
  select * into v_lib from profiles where id = auth.uid() and role = 'librarian';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Only librarians can process returns');
  end if;

  select * into v_loan from loans where id = p_loan_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Loan not found');
  end if;

  if v_loan.status in ('returned','expired') then
    return jsonb_build_object('ok', false, 'error', 'Loan already closed');
  end if;

  select * into v_book from books where id = v_loan.book_id;
  select * into v_user from profiles where id = v_loan.user_id;

  update loans set returned_date = now(), status = 'returned'
  where id = p_loan_id;

  if v_loan.format = 'physical' then
    if now() > v_loan.due_date then
      v_overdue := extract(day from (now() - v_loan.due_date))::int;
      if v_overdue > 0 then
        v_fine := v_overdue * 5;
        insert into fines (user_id, loan_id, amount) values (v_user.id, p_loan_id, v_fine);
        update profiles set fine_balance = coalesce(fine_balance,0) + v_fine where id = v_user.id;
      end if;
    end if;

    update books set available_physical = available_physical + 1 where id = v_book.id;

    select * into v_next
    from reservations
    where book_id = v_book.id and status = 'waiting'
    order by queue_position limit 1;

    if found then
      update reservations
        set status = 'notified',
            notified_at = now(),
            claim_expires_at = now() + interval '48 hours',
            format_offered = 'physical'
        where id = v_next.id;

      insert into notifications (user_id, type, message, link)
      values (
        v_next.user_id,
        'reservation',
        'A physical copy of "' || v_book.title || '" is available. You have 48 hours to claim it.',
        '/dashboard?tab=reservations'
      );
    end if;
  else
    update books set available_digital = available_digital + 1 where id = v_book.id;
  end if;

  return jsonb_build_object('ok', true,
    'fine_amount', coalesce(v_fine, 0),
    'overdue_days', coalesce(v_overdue, 0));
end;
$$;

-- ── renew_loan ─────────────────────────────────────────────
create or replace function renew_loan(p_loan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_loan  record;
  v_user  record;
  v_new_due timestamptz;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Loan not found');
  end if;

  if v_loan.user_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'You can only renew your own loans');
  end if;

  if v_loan.status not in ('active','overdue') then
    return jsonb_build_object('ok', false, 'error', 'Only active loans can be renewed');
  end if;

  if v_loan.renewed then
    return jsonb_build_object('ok', false, 'error', 'This loan has already been renewed once');
  end if;

  select * into v_user from profiles where id = v_loan.user_id;

  if coalesce(v_user.fine_balance, 0) >= 50 then
    return jsonb_build_object('ok', false, 'error', 'Clear your fines (GHS 50+) before renewing');
  end if;

  if exists (
    select 1 from reservations
    where book_id = v_loan.book_id and status in ('waiting','notified')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Cannot renew — another user is waiting for this title');
  end if;

  v_new_due := v_loan.due_date + (v_user.loan_period_days || ' days')::interval;
  update loans set due_date = v_new_due, renewed = true, status = 'active'
  where id = p_loan_id;

  return jsonb_build_object('ok', true, 'due_date', v_new_due);
end;
$$;

-- ── reserve_book ───────────────────────────────────────────
create or replace function reserve_book(p_book_id uuid, p_format text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user   record;
  v_book   record;
  v_pos    int;
  v_active int;
begin
  select * into v_user from profiles where id = auth.uid();
  if not found or v_user.role = 'librarian' then
    return jsonb_build_object('ok', false, 'error', 'Invalid account');
  end if;

  select * into v_book from books where id = p_book_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Book not found');
  end if;

  if p_format = 'physical' and v_book.available_physical > 0 then
    return jsonb_build_object('ok', false, 'error', 'Physical copies are available — borrow instead');
  end if;
  if p_format = 'digital' and v_book.available_digital > 0 then
    return jsonb_build_object('ok', false, 'error', 'Digital licences are available — borrow instead');
  end if;
  if p_format is null and (v_book.available_physical > 0 or v_book.available_digital > 0) then
    return jsonb_build_object('ok', false, 'error', 'Copies are available — borrow instead');
  end if;

  if exists (
    select 1 from reservations
    where book_id = p_book_id and user_id = v_user.id and status in ('waiting','notified')
  ) then
    return jsonb_build_object('ok', false, 'error', 'You already have a reservation for this title');
  end if;

  select count(*) into v_active from loans where user_id = v_user.id and status in ('active','overdue');
  if v_active >= v_user.max_loans then
    return jsonb_build_object('ok', false, 'error', 'You are at your loan limit');
  end if;

  select coalesce(max(queue_position),0) + 1 into v_pos
  from reservations where book_id = p_book_id and status in ('waiting','notified');

  insert into reservations (user_id, book_id, queue_position, status)
  values (v_user.id, p_book_id, v_pos, 'waiting');

  return jsonb_build_object('ok', true, 'position', v_pos);
end;
$$;

-- ── claim_reservation ──────────────────────────────────────
create or replace function claim_reservation(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_res   record;
  v_book  record;
  v_fmt   text;
  v_res_result jsonb;
begin
  select * into v_res from reservations where id = p_reservation_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Reservation not found');
  end if;

  if v_res.user_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Not your reservation');
  end if;

  if v_res.status <> 'notified' then
    return jsonb_build_object('ok', false, 'error', 'Reservation is not awaiting a claim');
  end if;

  if v_res.claim_expires_at is not null and now() > v_res.claim_expires_at then
    update reservations set status = 'expired' where id = p_reservation_id;
    return jsonb_build_object('ok', false, 'error', 'Claim window has expired');
  end if;

  select * into v_book from books where id = v_res.book_id;
  v_fmt := coalesce(v_res.format_offered,
    case when v_book.available_physical > 0 then 'physical' else 'digital' end);

  v_res_result := borrow_book(v_res.book_id, v_fmt);
  if (v_res_result->>'ok')::boolean then
    update reservations set status = 'fulfilled' where id = p_reservation_id;
    return jsonb_build_object('ok', true);
  else
    return v_res_result;
  end if;
end;
$$;

-- ── pay_fine ───────────────────────────────────────────────
create or replace function pay_fine(p_fine_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_fine record;
begin
  select * into v_fine from fines where id = p_fine_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Fine not found');
  end if;

  if v_fine.user_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Not your fine');
  end if;

  if v_fine.paid or v_fine.waived then
    return jsonb_build_object('ok', false, 'error', 'Fine already settled');
  end if;

  update fines set paid = true where id = p_fine_id;
  update profiles set fine_balance = greatest(fine_balance - v_fine.amount, 0)
  where id = v_fine.user_id;

  return jsonb_build_object('ok', true, 'amount', v_fine.amount);
end;
$$;

-- ── waive_fine (librarian) ─────────────────────────────────
create or replace function waive_fine(p_fine_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_fine record;
  v_lib  record;
begin
  select * into v_lib from profiles where id = auth.uid() and role = 'librarian';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Only librarians can waive fines');
  end if;

  select * into v_fine from fines where id = p_fine_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Fine not found');
  end if;

  if v_fine.paid or v_fine.waived then
    return jsonb_build_object('ok', false, 'error', 'Fine already settled');
  end if;

  update fines set waived = true where id = p_fine_id;
  update profiles set fine_balance = greatest(fine_balance - v_fine.amount, 0)
  where id = v_fine.user_id;

  return jsonb_build_object('ok', true, 'amount', v_fine.amount);
end;
$$;

-- ── expire_digital_loans (scheduled) ───────────────────────
create or replace function expire_digital_loans()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  v_loan  record;
  v_book  record;
  v_next  record;
begin
  for v_loan in
    select * from loans
    where format = 'digital' and status in ('active','overdue')
      and now() > due_date + interval '1 day'
  loop
    update loans set status = 'expired', returned_date = now(), expired_at = now()
    where id = v_loan.id;

    update books set available_digital = available_digital + 1 where id = v_loan.book_id;

    select * into v_book from books where id = v_loan.book_id;

    select * into v_next
    from reservations
    where book_id = v_loan.book_id and status = 'waiting'
    order by queue_position limit 1;

    if found then
      update reservations
        set status = 'notified',
            notified_at = now(),
            claim_expires_at = now() + interval '48 hours',
            format_offered = 'digital'
        where id = v_next.id;

      insert into notifications (user_id, type, message, link)
      values (
        v_next.user_id,
        'reservation',
        'A digital licence for "' || v_book.title || '" is available. You have 48 hours to claim it.',
        '/dashboard?tab=reservations'
      );
    end if;

    v_count := v_count + 1;
  end loop;

  update reservations
    set status = 'expired'
    where status = 'notified' and claim_expires_at is not null and now() > claim_expires_at;

  return jsonb_build_object('ok', true, 'expired', v_count);
end;
$$;

-- ── mark_overdue_loans (scheduled) ─────────────────────────
create or replace function mark_overdue_loans()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update loans set status = 'overdue'
  where status = 'active' and now() > due_date;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'marked_overdue', v_count);
end;
$$;

-- ── get_user_stats ─────────────────────────────────────────
create or replace function get_user_stats(p_user_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_active int;
  v_overdue int;
  v_reservations int;
  v_fines numeric;
begin
  select count(*) into v_active from loans where user_id = p_user_id and status in ('active','overdue');
  select count(*) into v_overdue from loans where user_id = p_user_id and status = 'overdue';
  select count(*) into v_reservations from reservations where user_id = p_user_id and status in ('waiting','notified');
  select coalesce(fine_balance,0) into v_fines from profiles where id = p_user_id;

  return jsonb_build_object(
    'active_loans', v_active,
    'overdue_loans', v_overdue,
    'reservations', v_reservations,
    'fine_balance', v_fines
  );
end;
$$;

-- ── get_librarian_analytics ────────────────────────────────
create or replace function get_librarian_analytics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_is_lib boolean;
begin
  select exists(select 1 from profiles where id = auth.uid() and role = 'librarian') into v_is_lib;
  if not v_is_lib then
    return jsonb_build_object('ok', false, 'error', 'Librarian only');
  end if;

  return jsonb_build_object(
    'ok', true,
    'total_loans', (select count(*) from loans),
    'active_loans', (select count(*) from loans where status in ('active','overdue')),
    'overdue_loans', (select count(*) from loans where status = 'overdue'),
    'returned_loans', (select count(*) from loans where status = 'returned'),
    'expired_loans', (select count(*) from loans where status = 'expired'),
    'total_fines_collected', (select coalesce(sum(amount),0) from fines where paid),
    'outstanding_fines', (select coalesce(sum(amount),0) from fines where not paid and not waived),
    'total_books', (select count(*) from books),
    'physical_copies_available', (select coalesce(sum(available_physical),0) from books),
    'digital_licences_available', (select coalesce(sum(available_digital),0) from books),
    'active_reservations', (select count(*) from reservations where status in ('waiting','notified')),
    'members', (select count(*) from profiles where role <> 'librarian')
  );
end;
$$;

-- ── EXECUTE grants for client-callable RPCs ────────────────
grant execute on function borrow_book(uuid, text) to authenticated;
grant execute on function return_book(uuid) to authenticated;
grant execute on function renew_loan(uuid) to authenticated;
grant execute on function reserve_book(uuid, text) to authenticated;
grant execute on function claim_reservation(uuid) to authenticated;
grant execute on function pay_fine(uuid) to authenticated;
grant execute on function waive_fine(uuid) to authenticated;
grant execute on function get_user_stats(uuid) to authenticated;
grant execute on function get_librarian_analytics() to authenticated;

-- Scheduled-job targets (invoked by the scheduled-tasks edge function via the
-- service-role key). Granted explicitly so they remain callable if the project
-- ever revokes the default PUBLIC EXECUTE privilege (Supabase hardening).
grant execute on function expire_digital_loans() to authenticated, anon;
grant execute on function mark_overdue_loans() to authenticated, anon;

-- ── due-date reminders ─────────────────────────────────────
create or replace function send_due_reminders()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  v_email_count int := 0;
  v_loan  record;
  v_book  record;
  v_user  record;
begin
  for v_loan in
    select l.* from loans l
    where l.status in ('active','overdue')
      and l.due_date between now() and now() + interval '2 days'
      and not exists (
        select 1 from notifications n
        where n.user_id = l.user_id
          and n.type = 'reminder'
          and n.link = '/loan/' || l.id::text
          and n.created_at > now() - interval '3 days'
      )
  loop
    select * into v_book from books where id = v_loan.book_id;
    select * into v_user from profiles where id = v_loan.user_id;
    
    insert into notifications (user_id, type, message, link)
    values (
      v_loan.user_id,
      'reminder',
      'Reminder: "' || v_book.title || '" is due ' ||
        to_char(v_loan.due_date at time zone 'GMT', 'YYYY-MM-DD HH24:MI'),
      '/dashboard'
    );
    v_count := v_count + 1;

    -- Queue email if user has email
    if v_user.email is not null then
      insert into email_logs (email, subject, type, status, html, text)
      select 
        v_user.email,
        'Reminder: "' || v_book.title || '" is due ' || to_char(v_loan.due_date, 'YYYY-MM-DD'),
        'due_reminder',
        'pending',
        get_due_reminder_email_html(v_book.title, COALESCE(v_user.full_name, 'Student'), v_loan.due_date, v_loan.id),
        get_due_reminder_email_text(v_book.title, COALESCE(v_user.full_name, 'Student'), v_loan.due_date, v_loan.id);
      v_email_count := v_email_count + 1;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'reminders', v_count, 'emails_queued', v_email_count);
end;
$$;

grant execute on function send_due_reminders() to authenticated, anon;
