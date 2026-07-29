/*
# KNUST Library — Seed Data

## Overview
Populates the catalogue with a representative set of hybrid (physical + digital)
books across multiple academic categories, plus a seeded knowledge base of FAQ
entries for the AI chatbot. Also creates the bootstrap librarian account.

## 1. Books
20 sample titles spanning Engineering, Sciences, Humanities, Business, Medicine,
and Computer Science. Each has physical + digital availability counters and a
digital access URL for digital loans.

## 2. FAQ entries
~15 policy/rule Q&A pairs covering loan durations, fines, limits, reservations,
renewals, and email domains. Embeddings are left NULL; the chatbot edge function
generates embeddings on first use or falls back to keyword matching.

## 3. Bootstrap librarian
Creates the first auth user + profile for `librarian@lib.knust.edu.gh` so the
system has an initial librarian. Password is set to a known value. Additional
librarian accounts are created via the create-librarian edge function by an
existing librarian.
*/

-- ── Sample books ───────────────────────────────────────────
insert into books (isbn, title, author, description, cover_url, category, type, total_physical, available_physical, total_digital, available_digital, digital_url, shelf_location)
values
('9780262033848', 'Introduction to Algorithms', 'Cormen, Leiserson, Rivest, Stein', 'Comprehensive textbook covering a broad range of algorithms in depth with full analysis and design techniques.', 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg', 'Computer Science', 'both', 5, 4, 3, 3, 'https://read.knust.edu.gh/d/algo', 'ENG-204'),
('9780132350884', 'Clean Code', 'Robert C. Martin', 'A handbook of agile software craftsmanship with practical advice on writing readable, maintainable code.', 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg', 'Computer Science', 'both', 4, 4, 2, 2, 'https://read.knust.edu.gh/d/cleancode', 'ENG-210'),
('9780201633610', 'Design Patterns', 'Gamma, Helm, Johnson, Vlissides', 'Elements of reusable object-oriented software — the classic Gang of Four patterns reference.', 'https://images.pexels.com/photos/3747139/pexels-photo-3747139.jpeg', 'Computer Science', 'physical', 3, 2, 0, 0, null, 'ENG-212'),
('9780073383095', 'Engineering Mechanics: Dynamics', 'Ferdinand Beer', 'Vector mechanics for engineers covering kinematics and dynamics of particles and rigid bodies.', 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg', 'Engineering', 'both', 6, 5, 4, 4, 'https://read.knust.edu.gh/d/dynamics', 'ENG-101'),
('9780133972735', 'Mechanics of Materials', 'Russell C. Hibbeler', 'Study of stress, strain, and deformation in structural members under load.', 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg', 'Engineering', 'both', 5, 3, 3, 3, 'https://read.knust.edu.gh/d/matmech', 'ENG-115'),
('9781118147290', 'Thermodynamics: An Engineering Approach', 'Yunus Cengel', 'Fundamental thermodynamic principles with engineering applications.', 'https://images.pexels.com/photos/2280568/pexels-photo-2280568.jpeg', 'Engineering', 'both', 4, 4, 2, 2, 'https://read.knust.edu.gh/d/thermo', 'ENG-130'),
('9780134275421', 'Electric Circuits', 'Nilsson & Riedel', 'Foundations of circuit analysis including DC, AC, and transient response.', 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg', 'Engineering', 'both', 5, 5, 3, 3, 'https://read.knust.edu.gh/d/circuits', 'ENG-145'),
('9780321769631', 'Organic Chemistry', 'Paula Yurkanis Bruice', 'Structure, mechanism, and reactions of organic compounds.', 'https://images.pexels.com/photos/2280579/pexels-photo-2280579.jpeg', 'Sciences', 'both', 6, 6, 4, 3, 'https://read.knust.edu.gh/d/orgchem', 'SCI-201'),
('9781429234146', 'Biochemistry', 'Berg, Tymoczko, Stryer', 'Molecular basis of life with focus on protein structure and metabolism.', 'https://images.pexels.com/photos/2280574/pexels-photo-2280574.jpeg', 'Medicine', 'both', 4, 3, 3, 3, 'https://read.knust.edu.gh/d/biochem', 'MED-301'),
('9781455726981', 'Robbins & Cotran Pathologic Basis of Disease', 'Kumar, Abbas, Aster', 'The definitive pathology text linking disease mechanisms to clinical presentation.', 'https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg', 'Medicine', 'physical', 3, 3, 0, 0, null, 'MED-310'),
('9780078021510', 'Principles of Corporate Finance', 'Brealey, Myers, Allen', 'Theory and practice of corporate finance, valuation, and capital budgeting.', 'https://images.pexels.com/photos/186461/pexels-photo-186461.jpeg', 'Business', 'both', 5, 5, 3, 3, 'https://read.knust.edu.gh/d/corfin', 'BUS-101'),
('9781259425369', 'Marketing Management', 'Philip Kotler', 'Strategic marketing planning, consumer behaviour, and brand management.', 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg', 'Business', 'both', 4, 4, 2, 2, 'https://read.knust.edu.gh/d/mktg', 'BUS-120'),
('9780133506408', 'Macroeconomics', 'Olivier Blanchard', 'Analysis of national and international economic activity, inflation, and policy.', 'https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg', 'Business', 'digital', 0, 0, 3, 3, 'https://read.knust.edu.gh/d/macro', 'BUS-140'),
('9780199607468', 'A History of West Africa', 'Adu Boahen', 'Political and social history of West African states from pre-colonial to modern times.', 'https://images.pexels.com/photos/2281551/pexels-photo-2281551.jpeg', 'Humanities', 'both', 5, 5, 2, 2, 'https://read.knust.edu.gh/d/westafrica', 'HUM-201'),
('9780521612563', 'The African Philosophy Reader', 'Coetzee & Roux', 'Selected readings in African philosophy and ethics.', 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg', 'Humanities', 'physical', 3, 2, 0, 0, null, 'HUM-205'),
('9780415538210', 'African Politics', 'Camilla Toulmin', 'Governance, state-building, and political economy in Africa.', 'https://images.pexels.com/photos/260791/pexels-photo-260791.jpeg', 'Humanities', 'both', 4, 3, 2, 2, 'https://read.knust.edu.gh/d/afripol', 'HUM-210'),
('9781464136940', 'Psychology', 'David Myers', 'Introduction to the science of behaviour and mental processes.', 'https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg', 'Sciences', 'both', 6, 6, 4, 4, 'https://read.knust.edu.gh/d/psych', 'SCI-250'),
('9781285740629', 'Calculus: Early Transcendentals', 'James Stewart', 'Single and multivariable calculus with applied examples.', 'https://images.pexels.com/photos/6238153/pexels-photo-6238153.jpeg', 'Sciences', 'both', 8, 7, 5, 5, 'https://read.knust.edu.gh/d/calc', 'SCI-110'),
('9780321767734', 'University Physics', 'Young & Freedman', 'Classical mechanics, electromagnetism, and modern physics.', 'https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg', 'Sciences', 'both', 7, 6, 4, 4, 'https://read.knust.edu.gh/d/physics', 'SCI-120'),
('9781305952300', 'Modern Control Engineering', 'Katsuhiko Ogata', 'Control system design, modelling, and stability analysis.', 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg', 'Engineering', 'both', 3, 3, 2, 1, 'https://read.knust.edu.gh/d/control', 'ENG-260')
on conflict (isbn) do nothing;

-- ── FAQ entries (keyword fallback; embeddings generated lazily) ──
insert into faq_embeddings (question, answer)
values
('How long can I borrow a book?', 'Students and post-graduate students can borrow books for 14 days. Staff can borrow for 30 days. This applies to both physical and digital books.'),
('What is the fine for late return?', 'The overdue fine for physical books is GHS 5 per day. This applies to all roles. There are no fines for digital loans — they simply expire after the due date.'),
('How many books can I borrow at once?', 'Students can have up to 2 active loans. Post-graduate students can have up to 6 active loans. Staff can have up to 10 active loans. The limit counts any mix of physical and digital loans.'),
('What email address do I use to register?', 'Students and post-graduate students use their @st.knust.edu.gh email. Staff use @stf.knust.edu.gh. Librarian accounts are created only by existing librarians and are not open for self-registration.'),
('Can I renew a loan?', 'Yes. You can renew a loan once, provided no one else has reserved the book and your fine balance is below GHS 50. The new due date is your original due date plus your full loan period (14 or 30 days).'),
('What happens if my fine balance is too high?', 'If your unpaid fine balance reaches GHS 50 or more, you cannot borrow or renew until you pay some or all of it. You can pay fines from your dashboard.'),
('What happens when a digital loan expires?', 'Digital loans expire automatically one day after the due date (a 1-day grace period). No fine is charged. The digital licence is released back to the catalogue and the next person in the reservation queue is notified.'),
('How do reservations work?', 'If a book is unavailable in the format you want, you can place a reservation. Reservations form a single first-come-first-served queue per book. When a copy becomes free, the first person in the queue is notified and has 48 hours to claim it.'),
('What is the 48-hour claim window?', 'When a reserved book becomes available, you receive a notification and have 48 hours to claim it. If you do not claim it within 48 hours, your reservation expires and the next person in the queue is notified.'),
('Can librarians borrow books?', 'No. Librarian accounts are for managing the library: processing loans and returns, managing the catalogue, waiving fines, and viewing analytics.'),
('How are librarian accounts created?', 'Librarian accounts can only be created by an existing librarian. The @lib.knust.edu.gh email domain is never shown in the public interface. Self-registration for librarians is disabled for security.'),
('What formats do books come in?', 'Books can be physical, digital, or both. Physical books are borrowed from the library counter. Digital books (e-books) give you an access link in your dashboard for the loan period.'),
('How do I access a digital book I have borrowed?', 'When you borrow a digital book, a read button appears in your dashboard under the Digital tab. The access link is only available while your loan is active.'),
('Can I borrow the same book twice at the same time?', 'No. You cannot have two active loans for the same title in the same format. You can, however, have one physical and one digital copy of a title that supports both, up to your loan limit.'),
('What are the KNUST library loan periods by role?', 'Student: 14 days, 2 books max. Post-graduate: 14 days, 6 books max. Staff: 30 days, 10 books max. All roles pay GHS 5 per day for late physical returns.')
on conflict do nothing;

-- ── Bootstrap librarian account ────────────────────────────
-- Uses the service-role admin API via SQL on auth.users so the handle_new_user
-- trigger accepts the admin_created flag and inserts the librarian profile.
-- Password: KnustLib@2024
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where lower(email) = 'librarian@lib.knust.edu.gh';
  if v_uid is null then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'librarian@lib.knust.edu.gh',
      crypt('KnustLib@2024', gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object('role','librarian','admin_created','true','provider','email'),
      jsonb_build_object('role','librarian','admin_created','true','full_name','KNUST Head Librarian')
    )
    returning id into v_uid;
  end if;
end;
$$;
