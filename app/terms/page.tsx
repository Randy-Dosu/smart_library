'use client';

import Link from 'next/link';
import { Library, ArrowLeft } from 'lucide-react';
import { AppShell } from '@/components/providers/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
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
                Terms of Service
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none space-y-6">
              <p className="text-muted-foreground">
                Last updated: July 30, 2026
              </p>

              <section>
                <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using the KNUST Library Management System ("the System"), you agree to be bound
                  by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the System.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">2. Description of Service</h2>
                <p>
                  The System is an automated hybrid (physical + digital) library management platform for
                  Kwame Nkrumah University of Science and Technology (KNUST). It enables:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Browsing and searching the library catalogue</li>
                  <li>Borrowing physical books and digital e-book licences</li>
                  <li>Placing and managing reservations</li>
                  <li>Tracking loans, due dates, and fines</li>
                  <li>Receiving SMS notifications (borrow confirmations, reminders, overdue notices)</li>
                  <li>Accessing AI-powered book recommendations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">3. Eligibility</h2>
                <p>You may use the System only if you are:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>A registered KNUST student, post-graduate student, staff member, or librarian</li>
                  <li>At least 18 years of age</li>
                  <li>Authorized by KNUST to access library services</li>
                </ul>
                <p>
                  By creating an account, you represent and warrant that you meet these eligibility requirements.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">4. Account Registration</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>You must register using your official KNUST email address (@st.knust.edu.gh, @stf.knust.edu.gh, or @lib.knust.edu.gh)</li>
                  <li>Your role (Student, Post-Graduate, Staff, Librarian) is determined by your email domain</li>
                  <li>You are responsible for maintaining the confidentiality of your password</li>
                  <li>You must notify library staff immediately of any unauthorized use of your account</li>
                  <li>Librarian accounts may only be created by existing librarians via the secure admin function</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">5. Borrowing Rules</h2>
                <p>The following rules apply to all loans:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Loan limits:</strong> Students (2), Post-Graduates (6), Staff (10) — combined physical + digital</li>
                  <li><strong>Loan periods:</strong> Students/Post-Graduates (14 days), Staff (30 days)</li>
                  <li><strong>Renewals:</strong> One renewal allowed per loan, if no reservation exists and fines < GHS 50</li>
                  <li><strong>Digital loans:</strong> Auto-expire after due date + 1-day grace period; no fines</li>
                  <li><strong>Overdue fines:</strong> GHS 5 per day per physical book; fines block borrowing at GHS 50+</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">6. Reservations</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Single FIFO queue per book (all formats combined)</li>
                  <li>48-hour claim window once notified of availability</li>
                  <li>Expired claims pass to the next person in queue</li>
                  <li>You may not reserve a book if copies are available — borrow instead</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">7. Fines and Fees</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Physical overdue: GHS 5 per day per book</li>
                  <li>Digital loans: No fines (auto-expire)</li>
                  <li>Fine threshold: GHS 50 blocks borrowing and renewals</li>
                  <li>Fines may be paid online or at the library counter</li>
                  <li>Librarians may waive fines at their discretion</li>
                  <li>Unpaid fines may be referred to KNUST finance office</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">8. Digital Content</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Digital e-books are licensed, not sold</li>
                  <li>Access is granted for the loan period only</li>
                  <li>Digital Rights Management (DRM) may be applied</li>
                  <li>Copying, distributing, or removing DRM is prohibited</li>
                  <li>Digital access auto-expires; no manual return needed</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">9. SMS Notifications</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>SMS notifications are optional; you must provide a phone number to receive them</li>
                  <li>Message types: borrow confirmations, due reminders, overdue notices, reservation alerts</li>
                  <li>SMS sent via Arkesel (Ghana-based provider); standard carrier rates may apply</li>
                  <li>You may opt out at any time by removing your phone number or contacting library staff</li>
                  <li>We are not liable for SMS delivery failures due to carrier issues</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">10. AI Book Recommender</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>Powered by Groq LLM (or keyword fallback when API unavailable)</li>
                  <li>Recommendations are based on catalogue metadata, not your personal borrowing history</li>
                  <li>Recommendations are suggestions only; the Library does not guarantee relevance or availability</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">11. Prohibited Conduct</h2>
                <p>You agree not to:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Share your account credentials with others</li>
                  <li>Attempt to bypass security controls or access unauthorized data</li>
                  <li>Tamper with digital e-book files or DRM</li>
                  <li>Use automated scripts, bots, or scrapers against the System</li>
                  <li>Submit false information during registration</li>
                  <li>Harass library staff or other users</li>
                  <li>Use the System for any illegal or unauthorized purpose</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">12. Intellectual Property</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>The System software, design, and database structure are owned by KNUST</li>
                  <li>Book metadata (titles, authors, descriptions) is sourced from public bibliographic sources</li>
                  <li>Book cover images are sourced from Pexels (royalty-free) or publisher-provided</li>
                  <li>Digital e-book content remains the property of respective publishers/authors</li>
                  <li>You may not reproduce, distribute, or create derivative works from the System</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">13. Privacy</h2>
                <p>
                  Your personal data is processed in accordance with our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                  By using the System, you consent to the data practices described therein.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">14. Disclaimer of Warranties</h2>
                <p>
                  THE SYSTEM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
                  INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                  NON-INFRINGEMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">15. Limitation of Liability</h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, KNUST LIBRARY SHALL NOT BE LIABLE FOR ANY INDIRECT,
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR
                  GOODWILL ARISING FROM YOUR USE OF THE SYSTEM.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">16. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless KNUST Library, its staff, and affiliates from any claims,
                  damages, losses, or expenses (including legal fees) arising from your violation of these Terms
                  or misuse of the System.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">17. Termination</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>You may close your account at any time by contacting library staff</li>
                  <li>We may suspend or terminate your access for violation of these Terms</li>
                  <li>Termination does not relieve you of outstanding fines or obligations</li>
                  <li>Provisions that should survive termination (fines, IP, liability) will survive</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold">18. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of the Republic of Ghana. Any disputes shall be resolved
                  in the courts of Kumasi, Ghana.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">19. Changes to Terms</h2>
                <p>
                  We may modify these Terms at any time. Material changes will be communicated via email or System
                  notification at least 30 days before taking effect. Continued use after changes constitutes acceptance.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold">20. Contact</h2>
                <p>For questions about these Terms, contact:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Email: <a href="mailto:library@knust.edu.gh" className="text-primary hover:underline">library@knust.edu.gh</a></li>
                  <li>Phone: +233 (0) 32 206 0000 (KNUST switchboard)</li>
                  <li>Address: KNUST Library, Kumasi, Ghana</li>
                </ul>
              </section>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}