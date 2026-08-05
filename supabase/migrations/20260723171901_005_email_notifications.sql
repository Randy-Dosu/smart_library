/*
# Email Overdue & Due Date Notifications
Run via scheduled task to send email notifications for overdue books and due date reminders
*/

-- Function to send overdue email notifications
create or replace function send_overdue_email_notifications()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  v_loan record;
  v_book record;
  v_user record;
  v_days_overdue int;
begin
  -- Get all overdue physical loans that haven't been notified via email today
  for v_loan in
    select l.*, p.email, p.full_name, p.phone
    from loans l
    join profiles p on p.id = l.user_id
    where l.format = 'physical'
      and l.status = 'overdue'
      and p.email is not null
      and not exists (
        select 1 from email_logs e
        where e.email = p.email
          and e.type = 'overdue_notice'
          and e.created_at > now() - interval '24 hours'
          and e.subject like '%' || l.id::text || '%'
      )
    order by l.due_date
  loop
    select * into v_book from books where id = v_loan.book_id;
    select * into v_user from profiles where id = v_loan.user_id;
    
    v_days_overdue := extract(day from (now() - v_loan.due_date))::int;
    
    -- Queue email via email_logs table
    insert into email_logs (email, subject, type, status, html, text)
    select 
      v_user.email,
      'OVERDUE: "' || v_book.title || '" - ' || v_days_overdue || ' days overdue',
      'overdue_notice',
      'pending',
      get_overdue_email_html(v_book.title, v_user.full_name, v_loan.due_date, v_days_overdue, v_days_overdue * 5, v_loan.id),
      get_overdue_email_text(v_book.title, v_user.full_name, v_loan.due_date, v_days_overdue, v_days_overdue * 5, v_loan.id);
    
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'emails_queued', v_count);
end;
$$;

-- Function to send due date email reminders (2 days before due)
create or replace function send_due_date_email_reminders()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  v_loan record;
  v_book record;
  v_user record;
begin
  -- Get active loans due in 2 days that haven't received email reminder
  for v_loan in
    select l.*, p.email, p.full_name, p.phone
    from loans l
    join profiles p on p.id = l.user_id
    where l.format = 'physical'
      and l.status in ('active','overdue')
      and l.due_date between now() and now() + interval '2 days'
      and p.email is not null
      and not exists (
        select 1 from email_logs e
        where e.email = p.email
          and e.type = 'due_reminder'
          and e.created_at > now() - interval '3 days'
          and e.subject like '%' || l.id::text || '%'
      )
    order by l.due_date
  loop
    select * into v_book from books where id = v_loan.book_id;
    select * into v_user from profiles where id = v_loan.user_id;
    
    -- Queue email via email_logs table
    insert into email_logs (email, subject, type, status, html, text)
    select 
      v_user.email,
      'Reminder: "' || v_book.title || '" is due ' || to_char(v_loan.due_date, 'YYYY-MM-DD'),
      'due_reminder',
      'pending',
      get_due_reminder_email_html(v_book.title, v_user.full_name, v_loan.due_date, v_loan.id),
      get_due_reminder_email_text(v_book.title, v_user.full_name, v_loan.due_date, v_loan.id);
    
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'emails_queued', v_count);
end;
$$;

-- Function to send borrow confirmation email
create or replace function send_borrow_confirmation_email(p_loan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_loan record;
  v_book record;
  v_user record;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Loan not found');
  end if;
  
  select * into v_book from books where id = v_loan.book_id;
  select * into v_user from profiles where id = v_loan.user_id;
  
  if v_user.email is null then
    return jsonb_build_object('ok', false, 'error', 'User has no email');
  end if;
  
  insert into email_logs (email, subject, type, status, html, text)
  select 
    v_user.email,
    'Book Borrowed: ' || v_book.title,
    'borrow_confirmation',
    'pending',
    get_borrow_confirmation_email_html(v_book.title, v_loan.format, v_loan.due_date, v_loan.id, v_user.full_name),
    get_borrow_confirmation_email_text(v_book.title, v_loan.format, v_loan.due_date, v_loan.id, v_user.full_name);
  
  return jsonb_build_object('ok', true, 'email_queued', true);
end;
$$;

-- Function to send reservation ready email
create or replace function send_reservation_ready_email(p_reservation_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_res record;
  v_book record;
  v_user record;
begin
  select * into v_res from reservations where id = p_reservation_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Reservation not found');
  end if;
  
  select * into v_book from books where id = v_res.book_id;
  select * into v_user from profiles where id = v_res.user_id;
  
  if v_user.email is null then
    return jsonb_build_object('ok', false, 'error', 'User has no email');
  end if;
  
  insert into email_logs (email, subject, type, status, html, text)
  select 
    v_user.email,
    'Reservation Ready: "' || v_book.title || '" is available',
    'reservation_ready',
    'pending',
    get_reservation_ready_email_html(v_book.title, v_res.format_offered, v_res.claim_expires_at, v_user.full_name),
    get_reservation_ready_email_text(v_book.title, v_res.format_offered, v_res.claim_expires_at, v_user.full_name);
  
  return jsonb_build_object('ok', true, 'email_queued', true);
end;
$$;

grant execute on function send_overdue_email_notifications() to authenticated, anon;
grant execute on function send_due_date_email_reminders() to authenticated, anon;
grant execute on function send_borrow_confirmation_email(uuid) to authenticated, anon;
grant execute on function send_reservation_ready_email(uuid) to authenticated, anon;