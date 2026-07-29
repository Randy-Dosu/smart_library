'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Coins,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Check,
  Ban,
  Loader2,
  UserPlus,
  RefreshCw,
  BookCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { AppShell } from '@/components/providers/app-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase, supabaseUrl } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { LibrarianAnalytics, Book, Loan, Fine, Profile, BookType } from '@/lib/database.types';

const CHART_COLORS = ['hsl(158 64% 22%)', 'hsl(43 93% 50%)', 'hsl(200 70% 45%)', 'hsl(0 72% 52%)', 'hsl(280 55% 55%)'];

export default function LibrarianPage() {
  return (
    <AppShell librarian>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-1">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-1">
            <BookCheck className="h-4 w-4" />
            Returns
          </TabsTrigger>
          <TabsTrigger value="catalogue" className="gap-1">
            <BookOpen className="h-4 w-4" />
            Catalogue
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="fines" className="gap-1">
            <Coins className="h-4 w-4" />
            Fines
          </TabsTrigger>
          <TabsTrigger value="librarians" className="gap-1">
            <UserPlus className="h-4 w-4" />
            Librarians
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="returns" className="mt-4">
          <ReturnsTab />
        </TabsContent>
        <TabsContent value="catalogue" className="mt-4">
          <CatalogueTab />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersTab />
        </TabsContent>
        <TabsContent value="fines" className="mt-4">
          <FinesTab />
        </TabsContent>
        <TabsContent value="librarians" className="mt-4">
          <LibrariansTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ── Overview ───────────────────────────────────────────────
function OverviewTab() {
  const { data: analytics, isLoading } = useQuery<LibrarianAnalytics>({
    queryKey: ['librarian-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_librarian_analytics');
      if (error) throw error;
      return data as LibrarianAnalytics;
    },
  });

  const { data: loanTrend = [] } = useQuery<{ date: string; count: number }[]>({
    queryKey: ['loan-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('borrowed_date')
        .order('borrowed_date', { ascending: true })
        .limit(500);
      if (error) throw error;
      const byDay = new Map<string, number>();
      ((data ?? []) as { borrowed_date: string }[]).forEach((l) => {
        const day = new Date(l.borrowed_date).toISOString().slice(0, 10);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      });
      return Array.from(byDay.entries())
        .slice(-14)
        .map(([date, count]) => ({ date: date.slice(5), count }));
    },
  });

  const { data: topBooks = [] } = useQuery<{ title: string; loans: number }[]>({
    queryKey: ['top-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('book:books(title)')
        .limit(1000);
      if (error) throw error;
      const counts = new Map<string, number>();
      ((data ?? []) as unknown as { book?: { title?: string } }[]).forEach((l) => {
        const title = l.book?.title;
        if (title) counts.set(title, (counts.get(title) ?? 0) + 1);
      });
      return Array.from(counts.entries())
        .map(([title, loans]) => ({ title, loans }))
        .sort((a, b) => b.loans - a.loans)
        .slice(0, 5);
    },
  });

  if (isLoading || !analytics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const statusPie = [
    { name: 'Active', value: analytics.active_loans },
    { name: 'Overdue', value: analytics.overdue_loans },
    { name: 'Returned', value: analytics.returned_loans },
    { name: 'Expired', value: analytics.expired_loans },
  ].filter((d) => d.value > 0);

  const stats = [
    { label: 'Total loans', value: analytics.total_loans, icon: BookOpen, color: 'bg-primary/10 text-primary' },
    { label: 'Active loans', value: analytics.active_loans, icon: TrendingUp, color: 'bg-secondary/20 text-secondary-foreground' },
    { label: 'Overdue', value: analytics.overdue_loans, icon: RefreshCw, color: 'bg-destructive/10 text-destructive' },
    { label: 'Fines collected', value: `GHS ${analytics.total_fines_collected}`, icon: Coins, color: 'bg-success/10 text-success' },
    { label: 'Outstanding fines', value: `GHS ${analytics.outstanding_fines}`, icon: Coins, color: 'bg-warning/10 text-warning' },
    { label: 'Total books', value: analytics.total_books, icon: BookOpen, color: 'bg-muted text-muted-foreground' },
    { label: 'Physical available', value: analytics.physical_copies_available, icon: BookOpen, color: 'bg-primary/10 text-primary' },
    { label: 'Digital available', value: analytics.digital_licences_available, icon: BookOpen, color: 'bg-secondary/20 text-secondary-foreground' },
    { label: 'Active reservations', value: analytics.active_reservations, icon: Users, color: 'bg-warning/10 text-warning' },
    { label: 'Members', value: analytics.members, icon: Users, color: 'bg-muted text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library Overview</h1>
        <p className="text-sm text-muted-foreground">Real-time analytics across the library system.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {loanTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loans over time (last 14 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={loanTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {statusPie.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loan status distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                    {statusPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {topBooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most borrowed titles</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topBooks} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="title" type="category" width={120} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="loans" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Returns ────────────────────────────────────────────────
function ReturnsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: activeLoans = [], isLoading } = useQuery<Loan[]>({
    queryKey: ['all-active-loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*, book:books(id, title, author), user:profiles(id, email, full_name, role)')
        .in('status', ['active', 'overdue'])
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Loan[];
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const { data, error } = await supabase.rpc('return_book', { p_loan_id: loanId });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; fine_amount?: number };
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      if (data.fine_amount && data.fine_amount > 0) {
        toast.success(`Book returned. Fine: GHS ${data.fine_amount}`);
      } else {
        toast.success('Book returned successfully');
      }
      queryClient.invalidateQueries({ queryKey: ['all-active-loans'] });
      queryClient.invalidateQueries({ queryKey: ['librarian-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['all-fines'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = activeLoans.filter(
    (l: Loan) =>
      !search ||
      l.book?.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.full_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Process Returns</h1>
        <p className="text-sm text-muted-foreground">Find the active loan and mark it returned. Overdue fines are calculated automatically.</p>
      </div>

      <Input
        placeholder="Search by book title or member..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active loans to return.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((loan: Loan) => {
            const dueDate = new Date(loan.due_date);
            const isOverdue = loan.status === 'overdue' || dueDate < new Date();
            const overdueDays = isOverdue
              ? Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
              : 0;
            return (
              <Card key={loan.id} className={isOverdue ? 'border-destructive/40' : ''}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{loan.book?.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {loan.user?.full_name ?? loan.user?.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={loan.format === 'physical' ? 'default' : 'secondary'} className="text-xs">
                        {loan.format}
                      </Badge>
                      <span className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Due {dueDate.toLocaleDateString()}
                        {isOverdue && ` · ${overdueDays} days overdue · GHS ${overdueDays * 5}`}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => returnMutation.mutate(loan.id)}
                    disabled={returnMutation.isPending}
                    className="gap-1"
                  >
                    {returnMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BookCheck className="h-4 w-4" />
                    )}
                    Return
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Catalogue management ───────────────────────────────────
function CatalogueTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Book | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').order('title');
      if (error) throw error;
      return (data ?? []) as Book[];
    },
  });

  const filtered = books.filter(
    (b: Book) => !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.author ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Book deleted');
      queryClient.invalidateQueries({ queryKey: ['books-admin'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage Catalogue</h1>
          <p className="text-sm text-muted-foreground">{books.length} titles in the catalogue.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              Add book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add new book</DialogTitle>
            </DialogHeader>
            <BookForm
              onSuccess={() => {
                setAddOpen(false);
                queryClient.invalidateQueries({ queryKey: ['books-admin'] });
                queryClient.invalidateQueries({ queryKey: ['books'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-2">
          {filtered.map((book: Book) => (
            <Card key={book.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-12 w-9 rounded bg-muted overflow-hidden flex-shrink-0">
                  {book.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{book.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{book.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      P: {book.available_physical}/{book.total_physical} · D: {book.available_digital}/{book.total_digital}
                    </span>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(book)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Edit book</DialogTitle>
                    </DialogHeader>
                    {editing?.id === book.id && (
                      <BookForm
                        book={editing}
                        onSuccess={() => {
                          setEditing(null);
                          queryClient.invalidateQueries({ queryKey: ['books-admin'] });
                          queryClient.invalidateQueries({ queryKey: ['books'] });
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete "${book.title}"?`)) deleteMutation.mutate(book.id);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BookForm({ book, onSuccess }: { book?: Book; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: book?.title ?? '',
    author: book?.author ?? '',
    isbn: book?.isbn ?? '',
    category: book?.category ?? '',
    description: book?.description ?? '',
    cover_url: book?.cover_url ?? '',
    type: (book?.type ?? 'both') as BookType,
    total_physical: book?.total_physical ?? 0,
    available_physical: book?.available_physical ?? 0,
    total_digital: book?.total_digital ?? 0,
    available_digital: book?.available_digital ?? 0,
    digital_url: book?.digital_url ?? '',
    shelf_location: book?.shelf_location ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, total_physical: Number(form.total_physical), available_physical: Number(form.available_physical), total_digital: Number(form.total_digital), available_digital: Number(form.available_digital) };
      if (book) {
        const { error } = await supabase.from('books').update(payload).eq('id', book.id);
        if (error) throw error;
        toast.success('Book updated');
      } else {
        const { error } = await supabase.from('books').insert(payload);
        if (error) throw error;
        toast.success('Book added');
      }
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-1.5">
          <Label>Author</Label>
          <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>ISBN</Label>
          <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as BookType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="digital">Digital</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Cover URL</Label>
          <Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Total physical</Label>
          <Input type="number" min={0} value={form.total_physical} onChange={(e) => setForm({ ...form, total_physical: Number(e.target.value) })} disabled={form.type === 'digital'} />
        </div>
        <div className="space-y-1.5">
          <Label>Available physical</Label>
          <Input type="number" min={0} value={form.available_physical} onChange={(e) => setForm({ ...form, available_physical: Number(e.target.value) })} disabled={form.type === 'digital'} />
        </div>
        <div className="space-y-1.5">
          <Label>Total digital</Label>
          <Input type="number" min={0} value={form.total_digital} onChange={(e) => setForm({ ...form, total_digital: Number(e.target.value) })} disabled={form.type === 'physical'} />
        </div>
        <div className="space-y-1.5">
          <Label>Available digital</Label>
          <Input type="number" min={0} value={form.available_digital} onChange={(e) => setForm({ ...form, available_digital: Number(e.target.value) })} disabled={form.type === 'physical'} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Digital URL</Label>
          <Input value={form.digital_url} onChange={(e) => setForm({ ...form, digital_url: e.target.value })} disabled={form.type === 'physical'} />
        </div>
        <div className="space-y-1.5">
          <Label>Shelf location</Label>
          <Input value={form.shelf_location} onChange={(e) => setForm({ ...form, shelf_location: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {book ? 'Save changes' : 'Add book'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Members ────────────────────────────────────────────────
function MembersTab() {
  const [search, setSearch] = useState('');
  const { data: members = [], isLoading } = useQuery<Profile[]>({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'librarian')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const filtered = members.filter(
    (m: Profile) =>
      !search ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.full_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground">{members.length} registered members.</p>
      </div>
      <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="space-y-2">
          {filtered.map((m: Profile) => (
            <Card key={m.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <Badge variant="secondary" className="text-xs capitalize">{m.role}</Badge>
                  <div className="text-xs text-muted-foreground">
                    <p>{m.max_loans} max · {m.loan_period_days}d</p>
                    {Number(m.fine_balance) > 0 && (
                      <p className="text-warning">GHS {m.fine_balance} fine</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fines ──────────────────────────────────────────────────
function FinesTab() {
  const queryClient = useQueryClient();
  const { data: fines = [], isLoading } = useQuery<Fine[]>({
    queryKey: ['all-fines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fines')
        .select('*, loan:loans(id, book:books(id, title)), user:profiles(id, email, full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fine[];
    },
  });

  const waiveMutation = useMutation({
    mutationFn: async (fineId: string) => {
      const { data, error } = await supabase.rpc('waive_fine', { p_fine_id: fineId });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Fine waived');
      queryClient.invalidateQueries({ queryKey: ['all-fines'] });
      queryClient.invalidateQueries({ queryKey: ['librarian-analytics'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const outstanding = fines.filter((f: Fine) => !f.paid && !f.waived);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Fines Management</h1>
        <p className="text-sm text-muted-foreground">{outstanding.length} outstanding fines.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : outstanding.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="h-10 w-10 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No outstanding fines.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {outstanding.map((fine: Fine) => (
            <Card key={fine.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">GHS {fine.amount}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(fine as Fine & { user?: Profile }).user?.full_name ?? (fine as Fine & { user?: Profile }).user?.email}
                    {' · '}
                    {(fine.loan as Fine['loan'] & { book?: { title: string } })?.book?.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(fine.created_at).toLocaleDateString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => waiveMutation.mutate(fine.id)}
                  disabled={waiveMutation.isPending}
                  className="gap-1"
                >
                  <Ban className="h-3 w-3" />
                  Waive
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Librarians ─────────────────────────────────────────────
function LibrariansTab() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', department: '' });
  const [submitting, setSubmitting] = useState(false);

  const { data: librarians = [], isLoading } = useQuery<Profile[]>({
    queryKey: ['librarians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'librarian')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const createLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/create-librarian`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Failed to create librarian');
      toast.success('Librarian account created');
      setOpen(false);
      setForm({ username: '', password: '', full_name: '', department: '' });
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Librarian Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Only existing librarians can create new librarian accounts. The @lib.knust.edu.gh domain is masked.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <UserPlus className="h-4 w-4" />
              Add librarian
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create librarian account</DialogTitle>
            </DialogHeader>
            <form onSubmit={createLibrarian} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <div className="flex">
                  <Input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    placeholder="j.doe"
                    className="rounded-r-none"
                  />
                  <span className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    @•••.knust.edu.gh
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">The full domain is never shown.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Password (min 8 chars)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {librarians.map((lib: Profile) => (
            <Card key={lib.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{lib.full_name || 'Librarian'}</p>
                  <p className="text-xs text-muted-foreground">
                    {lib.email.split('@')[0]}@•••.knust.edu.gh
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">Librarian</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
