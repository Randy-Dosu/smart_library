'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  Library,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Layers,
    title: 'Hybrid Catalogue',
    desc: 'Borrow physical books or check out digital e-book licences — all from one catalogue.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    desc: 'Students, post-graduates, staff, and librarians each get tailored permissions and limits.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First',
    desc: 'A responsive, animated interface built on Tailwind and shadcn/ui for any device.',
  },
  {
    icon: Sparkles,
    title: 'AI Book Recommender',
    desc: 'Tell our AI what you want to read or study and get personalized picks from the catalogue instantly.',
  },
];

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      router.push(profile.role === 'librarian' ? '/librarian' : '/dashboard');
    }
  }, [loading, user, profile, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Library className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm">KNUST Library</p>
              <p className="text-[10px] text-muted-foreground">Automated Management System</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute top-40 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="text-center max-w-3xl mx-auto animate-in-up">
            <Badge className="mb-4 gap-1" variant="secondary">
              <GraduationCap className="h-3 w-3" />
              Kwame Nkrumah University of Science and Technology
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              Your library, <span className="text-primary">reimagined</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Borrow physical books and digital e-books, reserve titles in a fair
              queue, track your loans and fines, and get personalized book
              recommendations from our AI — all in one beautiful system.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Create your account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className="animate-in-up hover:shadow-lg transition-shadow border-border/60"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent className="pt-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground">
          <CardContent className="p-8 sm:p-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl sm:text-3xl font-bold">Ready to start reading?</h2>
            <p className="mt-3 opacity-90 max-w-xl mx-auto">
              Sign up with your KNUST email and borrow your first book in minutes.
            </p>
            <Link href="/signup" className="inline-block mt-6">
              <Button variant="secondary" size="lg" className="gap-2">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>KNUST Library Management System</p>
          <p className="mt-1 text-xs">Built with React, Supabase, Tailwind CSS, and shadcn/ui.</p>
        </div>
      </footer>
    </div>
  );
}
