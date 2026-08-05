'use client';

import Link from 'next/link';
import { Library, ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/providers/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Library className="h-6 w-6 text-primary" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none space-y-6">
              <p className="text-muted-foreground">
                Last updated: July 30, 2026
              </p>

              <section>
                <h2 className="text-xl font-semibold">1. Introduction</h2>
                <p>
                  Kwame Nkrumah University of Science and Technology (KNUST) Library ("we", "us", "our") operates
                  the KNUST Library Management System ("the System"). This Privacy Policy explains how we collect,
                  use, disclose, and safeguard your personal information when you use the System.
                </p>
                <p>
                  By using the System, you agree to the collection and use of information in accordance with this
                  policy. If you do not agree with our policies and practices, do not use the System.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">2. Information We Collect</h2>
                <p>We collect the following categories of personal data:</p>

                <h3 className="font-semibold mt-4">Account Information</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Full name</li>
                  <li>KNUST email address</li>
                  <li>Username (KNUST ID)</li>
                  <li>Department</li>
                  <li>Role (Student, Post-Graduate, Staff, Librarian)</li>
                  <li>Phone number (optional, for SMS notifications)</li>
                  <li>Password (hashed and salted, never stored in plain text)</li>
                </ul>

                <h3 className="font-semibold mt-4">Library Activity Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Borrowing history (books borrowed, due dates, return dates)</li>
                  <li>Current active loans</li>
                  <li>Reservation history and queue positions</li>
                  <li>Fine records (amounts, payments, waivers)</li>
                  <li>Digital loan access logs</li>
                  <li>AI recommender queries (optional, not linked to identity in analytics)</li>
                </ul>

                <h3 className="font-semibold mt-4">Technical Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>IP address (for security and fraud prevention)</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Access timestamps</li>
                  <li>Pages visited and actions performed</li>
                </ul>

                <h3 className="font-semibold mt-4">SMS Communication Data</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Phone number (only if provided)</li>
                  <li>SMS delivery status and timestamps</li>
                  <li>Message content (borrow confirmations, reminders, overdue notices)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
                <p>We use your personal data for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Providing library services:</strong> Managing loans, returns, reservations, and digital access</li>
                  <li><strong>Account management:</strong> Authentication, profile maintenance, role-based access control</li>
                  <li><strong>Notifications:</strong> Sending due date reminders, overdue notices, reservation alerts, and borrow confirmations via email and SMS</li>
                  <li><strong>Fine management:</strong> Calculating, tracking, and processing overdue fines</li>
                  <li><strong>Service improvement:</strong> Analyzing usage patterns to optimize catalogue, purchasing, and service delivery</li>
                  <li><strong>Security and fraud prevention:</strong> Detecting unauthorized access, abuse, or system misuse</li>
                  <li><strong>Compliance:</strong> Meeting KNUST, Ghanaian legal, and audit requirements</li>
                  <li><strong>AI recommendations:</strong> Providing personalized book suggestions (with your consent via query submission)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">4. Legal Basis for Processing (GDPR/Ghana Data Protection Act)</h2>
                <p>We process your data on the following legal grounds:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Contractual necessity:</strong> To fulfill our obligations as your library service provider (loans, returns, notifications)</li>
                  <li><strong>Legitimate interests:</strong> Service improvement, security, fraud prevention, analytics</li>
                  <li><strong>Legal obligation:</strong> Record-keeping, audit trails, KNUST and Ghanaian regulatory compliance</li>
                  <li><strong>Consent:</strong> SMS notifications, AI recommender queries, optional phone number provision</li>
                  <li><strong>Vital interests:</strong> Emergency contact if needed for library safety</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">5. Data Sharing and Disclosure</h2>
                <p>We do not sell your personal data. We may share data only in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Library staff:</strong> Authorized librarians and staff access data to process loans, returns, fines, and provide support</li>
                  <li><strong>Service providers:</strong> Arkesel (SMS delivery), Supabase (database/hosting), Groq (AI recommendations) — all under data processing agreements</li>
                  <li><strong>KNUST administration:</strong> For institutional reporting, audit, and compliance purposes</li>
                  <li><strong>Legal requirements:</strong> When required by Ghanaian law, court order, or regulatory authority</li>
                  <li><strong>Emergency situations:</strong> To protect life, safety, or property</li>
                </ul>
                <p>
                  All third-party processors are contractually bound to protect your data and use it only for the
                  specified purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">6. Data Retention</h2>
                <p>We retain your data for the following periods:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Account data:</strong> Duration of your active membership + 3 years after account closure</li>
                  <li><strong>Loan history:</strong> 7 years (for audit, fine tracking, and statistical purposes)</li>
                  <li><strong>Fine records:</strong> 7 years after payment/waiver</li>
                  <li><strong>SMS logs:</strong> 2 years</li>
                  <li><strong>Technical logs:</strong> 12 months</li>
                  <li><strong>AI recommender queries:</strong> Not stored with personal identifiers; aggregated analytics retained for 2 years</li>
                </ul>
                <p>
                  Anonymized statistical data may be retained indefinitely for institutional planning and research.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">7. Your Rights</h2>
                <p>Under applicable data protection laws (including Ghana Data Protection Act 2012 and GDPR where applicable), you have the right to:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                  <li><strong>Erasure:</strong> Request deletion (subject to legal retention obligations)</li>
                  <li><strong>Restriction:</strong> Limit processing in certain circumstances</li>
                  <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
                  <li><strong>Withdraw consent:</strong> For SMS notifications or AI recommender at any time</li>
                  <li><strong>Complaint:</strong> Lodge a complaint with the Ghana Data Protection Commission or relevant supervisory authority</li>
                </ul>
                <p>
                  To exercise these rights, contact the Data Protection Officer at <a href="mailto:dpo@knust.edu.gh" className="text-primary hover:underline">dpo@knust.edu.gh</a> or submit a request via the Library help desk.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">8. Data Security</h2>
                <p>We implement appropriate technical and organizational measures to protect your data:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Encryption in transit (TLS 1.2+) and at rest (AES-256)</li>
                  <li>Role-based access control (RBAC) with principle of least privilege</li>
                  <li>Row Level Security (RLS) policies in PostgreSQL ensuring data isolation</li>
                  <li>Secure password hashing (bcrypt with salt)</li>
                  <li>JWT-based authentication with short-lived access tokens</li>
                  <li>Regular security assessments and vulnerability scanning</li>
                  <li>Staff training on data protection and privacy</li>
                  <li>Incident response plan for data breaches</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">9. International Transfers</h2>
                <p>
                  Our primary data storage is in Ghana/West Africa region via Supabase. Some service providers
                  (Groq for AI, potentially Arkesel) may process data outside Ghana. We ensure appropriate safeguards
                  (Standard Contractual Clauses, adequacy decisions, or your explicit consent) for any international
                  transfers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">10. Children's Privacy</h2>
                <p>
                  The System is not intended for children under 18. If you are a parent/guardian and believe your child
                  has provided us with personal data, please contact us to have it removed.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">11. SMS Communications</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>SMS notifications are opt-in; you must provide a phone number to receive them</li>
                  <li>Message types: borrow confirmations, due reminders (2 days before), overdue notices, reservation availability</li>
                  <li>Delivered via Arkesel (Ghana-licensed SMS provider)</li>
                  <li>Standard carrier messaging rates may apply</li>
                  <li>You may opt out at any time by removing your phone number from your profile or contacting library staff</li>
                  <li>We do not share your phone number with third parties except Arkesel for delivery</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">12. Cookies and Tracking</h2>
                <p>
                  The System uses essential cookies only: session management, authentication tokens, and CSRF protection.
                  We do not use analytics cookies, advertising cookies, or third-party tracking. Your browser's local
                  storage may store UI preferences (theme, sidebar state).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">13. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. Material changes will be communicated via email
                  or System notification at least 30 days before taking effect. The "Last updated" date at the top
                  reflects the most recent revision.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">14. Contact Us</h2>
                <p>For questions, concerns, or to exercise your data rights:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Data Protection Officer: <a href="mailto:dpo@knust.edu.gh" className="text-primary hover:underline">dpo@knust.edu.gh</a></li>
                  <li>Library Help Desk: <a href="mailto:library@knust.edu.gh" className="text-primary hover:underline">library@knust.edu.gh</a></li>
                  <li>Phone: +233 (0) 32 206 0000 (KNUST switchboard)</li>
                  <li>Address: KNUST Library, Kumasi, Ghana</li>
                </ul>
                <p>
                  You also have the right to lodge a complaint with the Ghana Data Protection Commission:
                </p>
                <p className="text-sm text-muted-foreground">
                  Data Protection Commission, Ghana<br />
                  Email: info@dataprotection.gov.gh<br />
                  Website: <a href="https://www.dataprotection.gov.gh" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">dataprotection.gov.gh</a>
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}