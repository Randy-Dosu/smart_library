"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Library, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && profile) {
    router.push(profile.role === "librarian" ? "/librarian" : "/dashboard");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    // onAuthStateChange will handle redirect
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
        <Card className="w-full max-w-md animate-in-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in with your KNUST email and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@st.knust.edu.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Sign in
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
            <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Demo librarian account
              </p>
              <p>librarian@lib.knust.edu.gh · KnustLib@2024</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
