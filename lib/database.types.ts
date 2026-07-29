export type Role = 'student' | 'postgrad' | 'staff' | 'librarian';
export type BookType = 'physical' | 'digital' | 'both';
export type LoanFormat = 'physical' | 'digital';
export type LoanStatus = 'active' | 'returned' | 'overdue' | 'expired';
export type ReservationStatus =
  | 'waiting'
  | 'notified'
  | 'fulfilled'
  | 'expired';

export interface Profile {
  id: string;
  role: Role;
  email: string;
  full_name: string | null;
  department: string | null;
  max_loans: number | null;
  loan_period_days: number | null;
  fine_balance: number | null;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  category: string | null;
  type: BookType;
  total_physical: number;
  available_physical: number;
  total_digital: number;
  available_digital: number;
  digital_url: string | null;
  shelf_location: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  book_id: string;
  format: LoanFormat;
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: LoanStatus;
  renewed: boolean;
  expired_at: string | null;
  created_at: string;
  book?: Pick<Book, 'id' | 'title' | 'author' | 'cover_url' | 'category' | 'digital_url' | 'shelf_location'>;
  user?: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'>;
}

export interface Fine {
  id: string;
  user_id: string;
  loan_id: string | null;
  amount: number;
  paid: boolean;
  waived: boolean;
  created_at: string;
  loan?: Pick<Loan, 'id' | 'book_id'> & {
    book?: Pick<Book, 'id' | 'title'>;
  };
}

export interface Reservation {
  id: string;
  user_id: string;
  book_id: string;
  queue_position: number | null;
  status: ReservationStatus;
  format_offered: LoanFormat | null;
  notified_at: string | null;
  claim_expires_at: string | null;
  fulfilled_loan_id: string | null;
  created_at: string;
  book?: Pick<Book, 'id' | 'title' | 'author' | 'cover_url'>;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface UserStats {
  active_loans: number;
  overdue_loans: number;
  reservations: number;
  fine_balance: number;
}

export interface LibrarianAnalytics {
  ok: boolean;
  error?: string;
  total_loans: number;
  active_loans: number;
  overdue_loans: number;
  returned_loans: number;
  expired_loans: number;
  total_fines_collected: number;
  outstanding_fines: number;
  total_books: number;
  physical_copies_available: number;
  digital_licences_available: number;
  active_reservations: number;
  members: number;
}
