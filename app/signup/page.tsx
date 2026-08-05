'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Library, Loader2, AlertCircle, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { KNUST_DOMAINS, ROLE_CONFIG, emailDomain } from '@/lib/domain-rules';
import type { Role } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const signupRoles: { role: Role; label: string; domain: string; max: string; period: string }[] = [
  { role: 'student', label: 'Student', domain: KNUST_DOMAINS.student, max: '3 books', period: '14 days' },
  { role: 'postgrad', label: 'Post-Graduate', domain: KNUST_DOMAINS.postgrad, max: '6 books', period: '14 days' },
  { role: 'staff', label: 'Staff', domain: KNUST_DOMAINS.staff, max: '10 books', period: '30 days' },
];

export default function SignupPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [role, setRole] = useState<Role>('student');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.push(profile.role === 'librarian' ? '/librarian' : '/dashboard');
    }
  }, [loading, user, profile, router]);

  const expectedDomain = ROLE_CONFIG[role].domain;
  const fullEmail = `${username.trim().toLowerCase()}@${expectedDomain}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms || !acceptPrivacy) {
      setError('You must accept the Terms of Service and Privacy Policy to continue');
      return;
    }

    if (!username.trim()) {
      setError('Enter your KNUST username');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (username.includes('@')) {
      setError('Enter only your username, not the full email');
      return;
    }

    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: fullEmail,
      password,
      options: {
        data: {
          role,
          full_name: fullName.trim(),
          department: department.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.user) {
      // The handle_new_user trigger inserts the profile row.
      router.push('/login?signedup=1');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-background">
      <header className="h-16 border-b border-border/60 glass flex items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Library className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm">KNUST Library</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg animate-in-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Use your KNUST email. Your role determines your loan limits and loan period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Role selection */}
              <div className="space-y-2">
                <Label>Select your role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {signupRoles.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setRole(r.role)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition-all',
                        role === r.role
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <p className="font-medium text-sm">{r.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.max}</p>
                      <p className="text-xs text-muted-foreground">{r.period}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Kwame Mensah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">KNUST username</Label>
                <div className="flex">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="kwame.mensah"
                    className="rounded-r-none"
                  />
                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    @{expectedDomain}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Your email will be {fullEmail}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Terms and Privacy checkboxes */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={acceptTerms}
                    onCheckedChange={(v) => setAcceptTerms(v === true)}
                    required
                  />
                  <div className="text-sm text-muted-foreground pt-1">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="acceptPrivacy"
                    checked={acceptPrivacy}
                    onCheckedChange={(v) => setAcceptPrivacy(v === true)}
                    required
                  />
                  <div className="text-sm text-muted-foreground pt-1">
                    I consent to KNUST Library processing my personal data for library services
                    and communications as described in the Privacy Policy.
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create account
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Librarian accounts are created only by existing librarians.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
