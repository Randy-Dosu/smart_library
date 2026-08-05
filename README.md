# KNUST Automated Library Management System

A production-ready, hybrid (physical + digital) library management system for Kwame Nkrumah University of Science and Technology (KNUST), built with Next.js, Supabase, Tailwind CSS, and shadcn/ui. The system follows rigorous Systems Analysis and Design techniques, enforcing KNUST-specific business rules server-side.

---

## Table of Contents

1. [Business Rules](#1-critical-knust-business-rules)
2. [Systems Analysis — Structured Analysis](#2-structured-analysis)
3. [Systems Analysis — Object-Oriented Analysis & Design](#3-object-oriented-analysis--design)
4. [Methodology — Agile / Scrum](#4-methodology--agile--scrum)
5. [Requirement Elicitation](#5-requirement-elicitation)
6. [Architecture & Tech Stack](#6-architecture--tech-stack)
7. [Database Schema](#7-database-schema)
8. [Security — RLS & Email Domain Validation](#8-security)
9. [Edge Functions & Scheduled Tasks](#9-edge-functions--scheduled-tasks)
10. [Setup & Demo Accounts](#10-setup--demo-accounts)

---

## 1. Critical KNUST Business Rules

| Rule | Student | Post-Graduate | Staff | Librarian |
|------|---------|---------------|-------|-----------|
| **Loan period** | 14 days | 14 days | 30 days | N/A |
| **Max active loans** (physical + digital combined) | 3 | 6 | 10 | N/A |
| **Overdue fine** | GHS 5/day | GHS 5/day | GHS 5/day | N/A |
| **Email domain** | @st.knust.edu.gh | @st.knust.edu.gh | @stf.knust.edu.gh | @lib.knust.edu.gh (masked) |

- **Fine threshold**: borrowing and renewing are blocked when fine balance >= GHS 50.
- **Digital loans**: no fines — they auto-expire after due date + 1-day grace period.
- **Renewals**: allowed once, only if no pending reservation and fine < GHS 50. New due date = original due date + full loan period.
- **Reservations**: single FIFO queue per book (any format). 48-hour claim window when notified.
- **Librarian accounts**: created only by existing librarians via a secure edge function. Self-registration is disabled. The @lib.knust.edu.gh domain is masked in all UI surfaces.

---

## 2. Structured Analysis

### 2.1 Data Flow Diagram (DFD) — Level 0 (Context Diagram)

```
                    ┌──────────────┐
                    │   Student /  │
                    │ Post-Grad /  │──────┐
                    │    Staff     │      │ (login, search, borrow, renew, reserve, pay fine)
                    └──────────────┘      │
                                          ▼
  ┌──────────────┐               ┌──────────────────┐               ┌──────────────┐
  │              │  (manage      │                  │  (process     │              │
  │  Librarian   │── catalogue,  │   KNUST Library  │   returns,    │   pg_cron /  │
  │              │   returns,    │     System       │   expiry)     │   scheduler  │
  └──────────────┘   fines)─────▶│                  │◀──────────────│              │
                                  └────────┬─────────┘               └──────────────┘
                                           │
                                           ▼
                                   ┌──────────────┐
                                   │  Supabase    │
                                   │  PostgreSQL  │
                                   └──────────────┘
```

### 2.2 DFD — Level 1: Borrow Physical Book

```
[User] →(search query)→ [1. Search Catalogue] →(book list)→ [User]
[User] →(borrow request: book_id, format=physical)→ [2. Validate Eligibility]
    2.1 Check total active loans < max_loans
    2.2 Check fine_balance < GHS 50
    2.3 Check available_physical > 0
    →(eligibility ok)→ [3. Create Loan] →(loan record)→ D1(Loans)
    →(decrement)→ D2(Books.available_physical)
    →(due_date = today + loan_period_days)→ [User]
```

### 2.3 DFD — Level 1: Borrow Digital Book

```
[User] →(borrow request: book_id, format=digital)→ [1. Validate Eligibility]
    1.1 Check total active loans < max_loans
    1.2 Check fine_balance < GHS 50
    1.3 Check available_digital > 0
    →(ok)→ [2. Create Loan] →(loan record)→ D1(Loans)
    →(decrement)→ D2(Books.available_digital)
    →(digital_url revealed)→ [User dashboard]
```

### 2.4 DFD — Level 1: Return & Fine Calculation

```
[Librarian] →(loan_id)→ [1. Process Return]
    1.1 Set returned_date, status='returned'
    1.2 If physical & overdue: fine = 5 × overdue_days → D3(Fines), update profile.fine_balance
    1.3 Increment books.available_physical
    1.4 Check reservation queue → [2. Notify Next Reservation]
        →(48h claim window)→ [Next User notification]
```

### 2.5 DFD — Level 1: Digital Loan Expiry (Scheduled)

```
[Scheduler] →(trigger)→ [1. Expire Digital Loans]
    1.1 Select loans WHERE format='digital' AND now > due_date + 1 day
    1.2 Set status='expired', returned_date=now
    1.3 Increment books.available_digital
    1.4 Notify next reservation in queue
    →(no fine generated)→ done
```

### 2.6 Data Dictionary

| Data Element | Type | Description |
|-------------|------|-------------|
| `role` | enum | student, postgrad, staff, librarian |
| `max_loans` | int | 2 / 6 / 10 / NULL |
| `loan_period_days` | int | 14 or 30 |
| `fine_balance` | numeric | Running total of unpaid fines (GHS) |
| `format` | enum | physical, digital |
| `status` (loan) | enum | active, returned, overdue, expired |
| `available_physical` | int | Physical copies currently available |
| `available_digital` | int | Digital licences currently available |
| `queue_position` | int | Position in FIFO reservation queue |
| `claim_expires_at` | timestamptz | 48 hours after notification |

### 2.7 Process Specifications

| Process | Input | Output | Logic |
|---------|-------|--------|-------|
| Borrow Book | book_id, format | loan record or error | Validate limits → check availability → create loan → decrement counter |
| Return Book | loan_id | fine (if any) | Close loan → calculate fine → increment counter → notify queue |
| Renew Loan | loan_id | new due_date | Check renewed flag → check reservations → check fines → extend due_date |
| Reserve Book | book_id, format | queue position | Check no copies available → check loan limit → append to queue |
| Expire Digital | (scheduled) | count expired | Mark expired → release licence → notify queue |
| Pay Fine | fine_id | confirmation | Mark paid → decrement fine_balance |
| Waive Fine | fine_id | confirmation | Librarian only → mark waived → decrement fine_balance |

---

## 3. Object-Oriented Analysis & Design

### 3.1 Use Case Diagram

```
                         ┌─────────────────────────────────────┐
                         │         KNUST Library System         │
                         │                                     │
  ┌──────────┐    ──────▶│  (login)                            │
  │          │           │                                     │
  │ Student  │    ──────▶│  (search catalogue)                 │
  │  / PG    │           │  (borrow physical)                  │
  │          │    ──────▶│  (borrow digital)                   │
  └──────────┘           │  (renew loan)                       │
                         │  (place reservation)                │
  ┌──────────┐    ──────▶│  (claim reservation)                │
  │  Staff   │           │  (pay fine)                         │
  └──────────┘           │  (view dashboard)                   │
                         │  (ask chatbot)                      │
  ┌──────────┐    ──────▶│                                     │
  │Librarian │           │  (process return) ◀── include ── (fine calc)│
  │          │    ──────▶│  (manage catalogue)                 │
  │          │           │  (waive fine)                       │
  │          │    ──────▶│  (create librarian)                 │
  │          │           │  (view analytics)                   │
  └──────────┘           └─────────────────────────────────────┘
```

### 3.2 Class Diagram

```
┌─────────────────────┐       ┌──────────────────────────┐
│      Profile        │       │          Book             │
├─────────────────────┤       ├──────────────────────────┤
│ - id: UUID          │       │ - id: UUID               │
│ - role: Role        │       │ - isbn: String           │
│ - email: String     │  1  * │ - title: String          │
│ - full_name: String │◄──────┤ - type: BookType         │
│ - department: String│       │ - available_physical: Int│
│ - max_loans: Int    │       │ - available_digital: Int │
│ - loan_period: Int  │       │ - digital_url: String    │
│ - fine_balance: Num │       │ - shelf_location: String │
├─────────────────────┤       └──────────────────────────┘
│ + canBorrow(): Bool │                    │ 1
│ + activeLoans(): Int│                    │
└─────────────────────┘                    │
           │ 1                             │ *
           │                               ▼
           │ *              ┌──────────────────────────┐
           ├───────────────▶│          Loan            │
           │                ├──────────────────────────┤
           │                │ - id: UUID               │
           │                │ - format: LoanFormat     │
           │                │ - borrowed_date: Date    │
           │                │ - due_date: Date         │
           │                │ - returned_date: Date    │
           │                │ - status: LoanStatus     │
           │                │ - renewed: Boolean       │
           │                └──────────────────────────┘
           │                                │ 1
           │ *                              │ *
           ├───────────────▶┌──────────────────────────┐
           │                │          Fine            │
           │                ├──────────────────────────┤
           │                │ - amount: Numeric        │
           │                │ - paid: Boolean          │
           │                │ - waived: Boolean        │
           │                └──────────────────────────┘
           │
           │ *              ┌──────────────────────────┐
           └───────────────▶│      Reservation         │
                            ├──────────────────────────┤
                            │ - queue_position: Int    │
                            │ - status: ResStatus      │
                            │ - format_offered: Format │
                            │ - notified_at: Date      │
                            │ - claim_expires_at: Date │
                            └──────────────────────────┘
```

**Key class relationships:**
- `Profile` 1 — * `Loan` (a user has many loans)
- `Profile` 1 — * `Fine` (a user accrues fines)
- `Profile` 1 — * `Reservation` (a user places reservations)
- `Book` 1 — * `Loan` (a book is loaned many times)
- `Book` 1 — * `Reservation` (a book has a reservation queue)
- `Loan` 1 — 0..1 `Fine` (a physical overdue loan generates one fine)

### 3.3 Sequence Diagrams

#### Borrow Physical Book

```
User        Catalogue UI    borrow_book()    Loans    Books    Reservations
 │              │                │             │        │           │
 │──search────▶│                │             │        │           │
 │◀──results───│                │             │        │           │
 │──borrow────▶│──call─────────▶│             │        │           │
 │             │                │──load user──▶│        │           │
 │             │                │──check limits│        │           │
 │             │                │──check avail─────────▶│           │
 │             │                │──INSERT loan▶│        │           │
 │             │                │──decrement───────────▶│           │
 │             │                │──fulfil res──────────────────────▶│
 │             │◀──ok, due_date─│             │        │           │
 │◀──success───│                │             │        │           │
```

#### Borrow Digital Book

```
User        Dashboard UI    borrow_book()    Loans    Books
 │              │                │             │        │
 │──borrow────▶│──call─────────▶│             │        │
 │             │                │──check limits│        │
 │             │                │──check digital────────▶│
 │             │                │──INSERT loan▶│        │
 │             │                │──decrement digital────▶│
 │             │◀──ok + digital_url│           │        │
 │◀──read btn──│                │             │        │
```

#### Return & Fine Calculation

```
Librarian    Return UI     return_book()   Loans    Books   Fines   Reservations
 │              │              │             │        │       │           │
 │──return────▶│──call───────▶│             │        │       │           │
 │             │              │──verify librarian     │       │           │
 │             │              │──close loan▶│        │       │           │
 │             │              │──if overdue:│        │       │           │
 │             │              │  fine=5×days─────────────────▶│           │
 │             │              │  update balance──────────────▶│           │
 │             │              │──incr avail─────────▶│       │           │
 │             │              │──notify next─────────────────────────────▶│
 │             │◀──fine amt───│             │        │       │           │
 │◀──success──│              │             │        │       │           │
```

#### Digital Loan Expiry (Scheduled)

```
Scheduler  expire_digital_loans()   Loans     Books    Notifications
 │                │                    │         │           │
 │──trigger────▶│                     │         │           │
 │              │──SELECT expired─────▶│         │           │
 │              │──UPDATE status='expired'│      │           │
 │              │──incr available_digital──────▶│           │
 │              │──notify next in queue────────────────────▶│
 │◀──count─────│                     │         │           │
```

#### Reservation Fulfilment

```
User-A   return_book()   Books   Reservations   Notifications   User-B
                              │         │              │           │
 │──return─▶│──incr avail───▶│         │              │           │
 │          │──find next in queue─────▶│              │           │
 │          │──set notified + 48h─────▶│              │           │
 │          │──create notification───────────────────▶│           │
 │          │                                        │──notify──▶│
 │                                                                       │
 │◀──done──│                                        │           │──claim─▶borrow_book()
```

---

## 4. Methodology — Agile / Scrum

The system was developed across 5 sprints:

| Sprint | Goal | Deliverables |
|--------|------|-------------|
| **Sprint 1** | Auth + Catalogue | Supabase schema, email-domain trigger, RLS, sign-up/sign-in, catalogue browse + search |
| **Sprint 2** | Borrow/Return + Fines | borrow_book, return_book, renew_loan RPCs, fine calculation (GHS 5/day), fine payment |
| **Sprint 3** | Reservation Queue | FIFO queue, notifications, 48-hour claim window, claim_reservation RPC |
| **Sprint 4** | Dashboards | User dashboard (physical/digital tabs), librarian analytics with Recharts, member & fine management |
| **Sprint 5** | AI Recommender + Polish | Groq-powered book recommender edge function, loading/error states, animations, README |

**Ceremonies:** Daily standups (simulated), sprint planning, sprint review, retrospective.
**Artifacts:** Product backlog (this requirements doc), sprint backlog, increment (working software).

---

## 5. Requirement Elicitation

Requirements were gathered through:

1. **Stakeholder interviews** — KNUST librarians, student representatives, and department heads identified the need for hybrid physical/digital lending, role-based limits, and automated fine calculation.
2. **Exam-season behavior analysis** — During exam periods, book demand surges. The reservation queue with 48-hour claim windows ensures fair access and prevents hoarding. The 2-book undergraduate limit was explicitly requested to maximize circulation.
3. **Email convention compliance** — KNUST uses distinct email domains by role (@st, @stf, @lib). The system enforces these server-side via a database trigger, preventing unauthorized role escalation.
4. **Fine policy review** — Librarians confirmed a uniform GHS 5/day rate for physical overdue books across all roles, with digital loans expiring fine-free to encourage e-book adoption.

---

## 6. Architecture & Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 13 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Recharts |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| **AI Book Recommender** | pgvector catalogue + Edge Function (Groq LLM for recommendations, keyword fallback) |
| **Scheduled Tasks** | `expire_digital_loans()`, `mark_overdue_loans()`, `send_due_reminders()` — triggered by pg_cron or external cron calling the `scheduled-tasks` edge function |
| **Hosting** | Netlify (via `@netlify/plugin-nextjs`) |

### Project Structure

```
/ (project root)
  app/                    # Next.js App Router pages
    page.tsx              # Landing page
    login/                # Sign in
    signup/               # Sign up (domain validation)
    catalogue/            # Browse + book detail + borrow/reserve
    dashboard/            # User dashboard (loans, fines, reservations)
    librarian/            # Librarian dashboard (analytics, returns, manage, fines, librarians)
    chatbot/              # AI assistant
  components/
    providers/            # Auth + query providers, app shell
    books/                # Book card
    ui/                   # shadcn/ui components
  lib/
    supabase-client.ts    # Supabase singleton
    database.types.ts     # TypeScript domain types
    domain-rules.ts       # KNUST email/role/limit rules
  supabase/
    functions/
      create-librarian/   # Librarian account creation (admin API)
      chatbot/            # AI book recommender (Groq-powered)
      scheduled-tasks/    # Digital expiry + overdue marking + reminders
  README.md               # This file
```

---

## 7. Database Schema

### Tables

**profiles** — extends `auth.users`
- `id` (UUID, PK, FK → auth.users), `role`, `email`, `full_name`, `department`
- `max_loans` (2/6/10/NULL), `loan_period_days` (14/30/NULL), `fine_balance`

**books** — hybrid catalogue
- `id`, `isbn`, `title`, `author`, `description`, `cover_url`, `category`
- `type` (physical/digital/both), `total_physical`, `available_physical`, `total_digital`, `available_digital`
- `digital_url`, `shelf_location`

**loans**
- `id`, `user_id`, `book_id`, `format` (physical/digital)
- `borrowed_date`, `due_date`, `returned_date`, `status`, `renewed`, `expired_at`

**fines**
- `id`, `user_id`, `loan_id`, `amount`, `paid`, `waived`, `created_at`

**reservations**
- `id`, `user_id`, `book_id`, `queue_position`, `status`
- `format_offered`, `notified_at`, `claim_expires_at`, `fulfilled_loan_id`

**notifications**
- `id`, `user_id`, `type`, `message`, `read`, `link`, `created_at`

**faq_embeddings**
- `id`, `question`, `answer`, `embedding` (vector 1536)

### Stored Procedures (Security Definer)

| Function | Purpose |
|----------|---------|
| `borrow_book(book_id, format)` | Enforce limits + fine threshold, create loan, decrement counter |
| `return_book(loan_id)` | Librarian return + fine calculation + queue notification |
| `renew_loan(loan_id)` | One renewal, check reservations + fines |
| `reserve_book(book_id, format)` | Join FIFO queue when unavailable |
| `claim_reservation(res_id)` | Claim a notified reservation |
| `pay_fine(fine_id)` | User pays own fine |
| `waive_fine(fine_id)` | Librarian waives fine |
| `expire_digital_loans()` | Auto-expire digital loans past grace period |
| `mark_overdue_loans()` | Flip active → overdue |
| `send_due_reminders()` | Notify users of upcoming due dates |
| `get_user_stats(user_id)` | Dashboard aggregate |
| `get_librarian_analytics()` | Librarian dashboard aggregate |

---

## 8. Security

### Row Level Security

- **profiles**: users read/update own profile; librarians read all profiles.
- **books**: all authenticated users can read; only librarians can insert/update/delete.
- **loans**: users read own; librarians read all. All mutations go through SECURITY DEFINER RPCs.
- **fines**: users read own; librarians read all. Mutations via RPCs only.
- **reservations**: users read own; librarians read all. Mutations via RPCs only.
- **notifications**: users manage own.
- **faq_embeddings**: all authenticated users can read.

### Email Domain Validation

A `handle_new_user()` trigger on `auth.users` validates the email domain against the requested role at sign-up:

| Domain | Allowed Roles |
|--------|--------------|
| @st.knust.edu.gh | student, postgrad |
| @stf.knust.edu.gh | staff |
| @lib.knust.edu.gh | librarian (admin-created only) |

The trigger derives `max_loans` and `loan_period_days` from the role automatically. Librarian self-registration is blocked unless the `admin_created` flag is set by the create-librarian edge function.

---

## 9. Edge Functions & Scheduled Tasks

### Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `create-librarian` | JWT (librarian) | Creates a new librarian account via service-role admin API. Masks @lib.knust.edu.gh domain. |
| `chatbot` | JWT | AI book recommender. Sends the user's interest query and the full catalogue to Groq's LLM, which returns 3 personalized recommendations with reasons. Falls back to keyword matching when `GROQ_API_KEY` is not set. |
| `scheduled-tasks` | Anon (cron) | Runs digital expiry, overdue marking, and due reminders in one pass. Call via pg_cron or external cron. |

### pg_cron Setup (optional)

To run scheduled tasks hourly:

```sql
select cron.schedule(
  'library-maintenance',
  '0 * * * *',
  $$ select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/scheduled-tasks',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>'),
    body := jsonb_build_object()
  ) $$
);
```

---

## 10. Setup & Demo Accounts

### Environment Variables

All Supabase credentials are pre-populated in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server/edge functions only)

### Groq API Key (for AI recommendations)

The book recommender uses Groq's API. When `GROQ_API_KEY` is configured as an edge function secret, the recommender uses Groq's LLM (llama-3.3-70b-versatile) for intelligent, personalized recommendations. Without the key, it falls back to keyword-based matching against the catalogue.

### Demo Librarian Account

```
Email:    librarian@lib.knust.edu.gh
Password: KnustLib@2024
```

### Getting Started

1. The database schema, RPCs, and seed data (20 books) are applied automatically via Supabase migrations.
2. Sign up as a student/staff member using your KNUST email domain.
3. Browse the catalogue and borrow physical or digital books.
4. Use the librarian account to process returns, manage the catalogue, waive fines, and view analytics.
5. Ask the AI book recommender what you want to read and get instant suggestions from the catalogue.

### Development

```bash
npm install      # install dependencies
npm run dev      # start dev server (runs automatically in Bolt)
npm run build    # production build
npm run typecheck # TypeScript check
```
