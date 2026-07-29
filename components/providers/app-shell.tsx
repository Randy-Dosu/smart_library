'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Library,
  LayoutDashboard,
  BookOpen,
  LogOut,
  Bell,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { ROLE_CONFIG, maskLibrarianEmail } from '@/lib/domain-rules';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/database.types';
import { supabase } from '@/lib/supabase-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ShellProps {
  children: React.ReactNode;
  librarian?: boolean;
}

export function AppShell({ children, librarian = false }: ShellProps) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && profile) {
      if (librarian && profile.role !== 'librarian') router.push('/dashboard');
      if (!librarian && profile.role === 'librarian') router.push('/librarian');
    }
  }, [loading, user, profile, librarian, router]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isLib = profile.role === 'librarian';
  const navItems = isLib
    ? [
        { href: '/librarian', label: 'Overview', icon: LayoutDashboard },
        { href: '/librarian/catalogue', label: 'Catalogue', icon: BookOpen },
      ]
    : [
        { href: '/dashboard', label: 'My Loans', icon: LayoutDashboard },
        { href: '/catalogue', label: 'Catalogue', icon: BookOpen },
      ];

  const initials = (profile.full_name || profile.email)
    .split(/[ .@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-border/60 glass">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 rounded-md hover:bg-muted"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Library className="h-4 w-4" />
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="font-bold text-sm">KNUST Library</p>
                <p className="text-[10px] text-muted-foreground">Management System</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-medium leading-tight">
                      {profile.full_name || 'User'}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {isLib ? maskLibrarianEmail(profile.email) : ROLE_CONFIG[profile.role].label}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <p className="font-medium text-sm">{profile.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    {isLib ? maskLibrarianEmail(profile.email) : profile.email}
                  </p>
                  {isLib && (
                    <Badge className="mt-1 text-[10px]" variant="secondary">
                      Librarian
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex w-60 flex-col border-r border-border/60 min-h-[calc(100vh-4rem)] py-6 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href ||
                (item.href !== '/dashboard' && item.href !== '/librarian' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-6">
            <Link href="/chatbot">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Recommend a book
              </Button>
            </Link>
          </div>
        </aside>

        {/* Sidebar (mobile) */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-64 bg-card border-r border-border p-4 animate-in-fade">
              <div className="flex items-center justify-between mb-6">
                <span className="font-semibold">Menu</span>
                <button onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <Link href="/chatbot" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full gap-2 mt-4">
                  <Sparkles className="h-4 w-4" />
                  Recommend a book
                </Button>
              </Link>
            </div>
            <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unread = notifications.filter((n: Notification) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground text-center">
            No notifications yet
          </p>
        )}
        {notifications.map((n: Notification) => (
          <DropdownMenuItem
            key={n.id}
            className="flex-col items-start gap-1 py-2 cursor-pointer"
            onClick={() => markRead.mutate(n.id)}
          >
            <div className="flex items-center gap-2 w-full">
              {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </div>
            <span className="text-sm">{n.message}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
