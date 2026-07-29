'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Book as BookIcon,
  Smartphone,
  Clock,
  RefreshCw,
  ExternalLink,
  Coins,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/providers/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase-client';
import { supabaseUrl } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Loan, Fine, Reservation, UserStats } from '@/lib/database.types';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_stats');
      if (error) throw error;
      return data as UserStats;
    },
    enabled: !!user,
  });

  const { data: loans = [], isLoading: loansLoading } = useQuery<Loan[]>({
    queryKey: ['my-loans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*, book:books(id, title, author, cover_url, category, digital_url, shelf_location)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Loan[];
    },
    enabled: !!user,
  });

  const { data: fines = [], isLoading: finesLoading } = useQuery<Fine[]>({
    queryKey: ['my-fines', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fines')
        .select('*, loan:loans(id, book_id, book:books(id, title))')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fine[];
    },
    enabled: !!user,
  });

  const { data: reservations = [], isLoading: resLoading } = useQuery<Reservation[]>({
    queryKey: ['my-reservations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, book:books(id, title, author, cover_url)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Reservation[];
    },
    enabled: !!user,
  });

  const renewMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const { data, error } = await supabase.rpc('renew_loan', { p_loan_id: loanId });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; due_date?: string };
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      toast.success(`Renewed! New due date: ${new Date(data.due_date!).toLocaleDateString()}`);
      queryClient.invalidateQueries({ queryKey: ['my-loans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const payMutation = useMutation({
    mutationFn: async (fineId: string) => {
      const { data, error } = await supabase.rpc('pay_fine', { p_fine_id: fineId });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Fine paid successfully');
      queryClient.invalidateQueries({ queryKey: ['my-fines'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const claimMutation = useMutation({
    mutationFn: async (resId: string) => {
      const { data, error } = await supabase.rpc('claim_reservation', { p_reservation_id: resId });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Reservation claimed — book borrowed!');
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['my-loans'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const physicalLoans = loans.filter((l: Loan) => l.format === 'physical');
  const digitalLoans = loans.filter((l: Loan) => l.format === 'digital');
  const outstandingFines = fines.filter((f: Fine) => !f.paid && !f.waived);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.full_name} · {loans.filter((l: Loan) => l.status === 'active' || l.status === 'overdue').length} of{' '}
              {profile?.max_loans} active loans
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active loans"
            value={stats?.active_loans ?? 0}
            icon={BookIcon}
            loading={statsLoading}
            color="primary"
          />
          <StatCard
            title="Overdue"
            value={stats?.overdue_loans ?? 0}
            icon={AlertTriangle}
            loading={statsLoading}
            color="destructive"
          />
          <StatCard
            title="Reservations"
            value={stats?.reservations ?? 0}
            icon={Bookmark}
            loading={statsLoading}
            color="warning"
          />
          <StatCard
            title="Fine balance"
            value={`GHS ${stats?.fine_balance ?? 0}`}
            icon={Coins}
            loading={statsLoading}
            color={stats && stats.fine_balance >= 50 ? 'destructive' : 'muted'}
          />
        </div>

        {/* Loans tabs */}
        <Tabs defaultValue="physical">
          <TabsList>
            <TabsTrigger value="physical" className="gap-1">
              <BookIcon className="h-4 w-4" />
              Physical ({physicalLoans.length})
            </TabsTrigger>
            <TabsTrigger value="digital" className="gap-1">
              <Smartphone className="h-4 w-4" />
              Digital ({digitalLoans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="physical" className="mt-4">
            <LoanList
              loans={physicalLoans}
              loading={loansLoading}
              onRenew={(id) => renewMutation.mutate(id)}
              renewing={renewMutation.isPending}
              emptyMsg="No physical loans yet. Browse the catalogue to borrow a book."
            />
          </TabsContent>

          <TabsContent value="digital" className="mt-4">
            <LoanList
              loans={digitalLoans}
              loading={loansLoading}
              onRenew={(id) => renewMutation.mutate(id)}
              renewing={renewMutation.isPending}
              showRead
              emptyMsg="No digital loans yet. Borrow an e-book to get an access link."
            />
          </TabsContent>
        </Tabs>

        {/* Fines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-warning" />
              Fines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {finesLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : outstandingFines.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No outstanding fines. You&apos;re all clear!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outstandingFines.map((fine: Fine) => (
                  <div
                    key={fine.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        GHS {fine.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fine.loan?.book?.title ?? 'Loan'} ·{' '}
                        {new Date(fine.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => payMutation.mutate(fine.id)}
                      disabled={payMutation.isPending}
                    >
                      {payMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `Pay GHS ${fine.amount}`
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : reservations.length === 0 ? (
              <div className="text-center py-6">
                <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No reservations yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map((res: Reservation) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{res.book?.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ReservationStatusBadge status={res.status} />
                        {res.status === 'waiting' && res.queue_position && (
                          <span className="text-xs text-muted-foreground">
                            Queue position #{res.queue_position}
                          </span>
                        )}
                        {res.status === 'notified' && res.claim_expires_at && (
                          <span className="text-xs text-warning flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Claim by {new Date(res.claim_expires_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {res.status === 'notified' && (
                      <Button
                        size="sm"
                        onClick={() => claimMutation.mutate(res.id)}
                        disabled={claimMutation.isPending}
                      >
                        Claim now
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  color: 'primary' | 'destructive' | 'warning' | 'muted';
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    muted: 'bg-muted text-muted-foreground',
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoanList({
  loans,
  loading,
  onRenew,
  renewing,
  showRead = false,
  emptyMsg,
}: {
  loans: Loan[];
  loading: boolean;
  onRenew: (id: string) => void;
  renewing: boolean;
  showRead?: boolean;
  emptyMsg: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{emptyMsg}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {loans.map((loan: Loan) => {
        const isOverdue = loan.status === 'overdue';
        const isExpired = loan.status === 'expired';
        const isReturned = loan.status === 'returned';
        const dueDate = new Date(loan.due_date);
        const now = new Date();
        const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return (
          <Card key={loan.id} className={isOverdue ? 'border-destructive/40' : ''}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Cover */}
              <div className="h-16 w-12 rounded bg-muted overflow-hidden flex-shrink-0">
                {loan.book?.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={loan.book.cover_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{loan.book?.title}</p>
                <p className="text-xs text-muted-foreground truncate">{loan.book?.author}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <LoanStatusBadge status={loan.status} />
                  {!isReturned && !isExpired && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive' : daysLeft <= 2 ? 'text-warning' : 'text-muted-foreground'}`}>
                      <Clock className="h-3 w-3" />
                      {isOverdue
                        ? `${Math.abs(daysLeft)} days overdue`
                        : daysLeft === 0
                          ? 'Due today'
                          : `${daysLeft} days left`}
                    </span>
                  )}
                  {loan.renewed && (
                    <span className="text-xs text-muted-foreground">Renewed once</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                {!isReturned && !isExpired && !loan.renewed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRenew(loan.id)}
                    disabled={renewing}
                    className="gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Renew
                  </Button>
                )}
                {showRead && loan.status === 'active' && loan.book?.digital_url && (
                  <a href={loan.book.digital_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Read
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function LoanStatusBadge({ status }: { status: Loan['status'] }) {
  const map = {
    active: { variant: 'default' as const, label: 'Active', icon: CheckCircle2 },
    overdue: { variant: 'destructive' as const, label: 'Overdue', icon: AlertTriangle },
    returned: { variant: 'secondary' as const, label: 'Returned', icon: CheckCircle2 },
    expired: { variant: 'secondary' as const, label: 'Expired', icon: XCircle },
  };
  const { variant, label, icon: Icon } = map[status];
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function ReservationStatusBadge({ status }: { status: Reservation['status'] }) {
  const map = {
    waiting: { variant: 'secondary' as const, label: 'Waiting' },
    notified: { variant: 'default' as const, label: 'Available!' },
    fulfilled: { variant: 'secondary' as const, label: 'Fulfilled' },
    expired: { variant: 'destructive' as const, label: 'Expired' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
}
