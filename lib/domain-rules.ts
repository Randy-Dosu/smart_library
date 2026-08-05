import type { Role } from './database.types';

export const KNUST_DOMAINS = {
  student: 'st.knust.edu.gh',
  postgrad: 'st.knust.edu.gh',
  staff: 'stf.knust.edu.gh',
  librarian: 'lib.knust.edu.gh',
} as const;

export const ROLE_CONFIG: Record<
  Role,
  { maxLoans: number | null; loanPeriodDays: number | null; label: string; domain: string }
> = {
  student: { maxLoans: 3, loanPeriodDays: 14, label: 'Student', domain: 'st.knust.edu.gh' },
  postgrad: { maxLoans: 6, loanPeriodDays: 14, label: 'Post-Graduate', domain: 'st.knust.edu.gh' },
  staff: { maxLoans: 10, loanPeriodDays: 30, label: 'Staff', domain: 'stf.knust.edu.gh' },
  librarian: { maxLoans: null, loanPeriodDays: null, label: 'Librarian', domain: 'lib.knust.edu.gh' },
};

export const FINE_RATE_PER_DAY = 5;
export const FINE_BLOCK_THRESHOLD = 50;
export const RESERVATION_CLAIM_HOURS = 48;
export const DIGITAL_GRACE_DAYS = 1;

export function emailDomain(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : '';
}

export function domainForRole(role: Role): string {
  return ROLE_CONFIG[role].domain;
}

export function roleFromEmail(email: string): Role | null {
  const domain = emailDomain(email);
  if (domain === 'st.knust.edu.gh') return null; // ambiguous — chosen at signup
  if (domain === 'stf.knust.edu.gh') return 'staff';
  if (domain === 'lib.knust.edu.gh') return 'librarian';
  return null;
}

export function maskLibrarianEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return email;
  const user = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedDomain = domain.startsWith('lib.') ? '•••.knust.edu.gh' : domain;
  return `${user}@${maskedDomain}`;
}
