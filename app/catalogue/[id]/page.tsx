'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Book as BookIcon,
  Smartphone,
  ArrowLeft,
  Loader2,
  Check,
  Clock,
  Bookmark,
  AlertCircle,
  MapPin,
  User,
} from 'lucide-react';
import { AppShell } from '@/components/providers/app-shell';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { Book } from '@/lib/database.types';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const bookId = params.id as string;

  const { data: book, isLoading } = useQuery<Book>({
    queryKey: ['book', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Book;
    },
  });

  const borrowMutation = useMutation({
    mutationFn: async (format: 'physical' | 'digital') => {
      const { data, error } = await supabase.rpc('borrow_book', {
        p_book_id: bookId,
        p_format: format,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; due_date?: string };
      if (!result.ok) throw new Error(result.error ?? 'Borrow failed');
      return result;
    },
    onSuccess: (data) => {
      toast.success(`Borrowed! Due ${new Date(data.due_date!).toLocaleDateString()}`);
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['my-loans'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      router.push('/dashboard');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reserveMutation = useMutation({
    mutationFn: async (format: 'physical' | 'digital' | null) => {
      const { data, error } = await supabase.rpc('reserve_book', {
        p_book_id: bookId,
        p_format: format,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; position?: number };
      if (!result.ok) throw new Error(result.error ?? 'Reservation failed');
      return result;
    },
    onSuccess: (data) => {
      toast.success(`Reserved! You are #${data.position} in the queue.`);
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-6 w-24 mb-6" />
          <div className="grid sm:grid-cols-[200px_1fr] gap-8">
            <Skeleton className="aspect-[3/4] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!book) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center py-16">
          <p className="text-muted-foreground">Book not found.</p>
          <Button onClick={() => router.push('/catalogue')} className="mt-4">
            Back to catalogue
          </Button>
        </div>
      </AppShell>
    );
  }

  const hasPhysical = book.type !== 'digital';
  const hasDigital = book.type !== 'physical';
  const physAvail = book.available_physical > 0;
  const digAvail = book.available_digital > 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-2"
          onClick={() => router.push('/catalogue')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to catalogue
        </Button>

        <div className="grid sm:grid-cols-[220px_1fr] gap-8">
          {/* Cover */}
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted shadow-lg">
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <BookIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              {book.category && (
                <Badge variant="secondary" className="mb-2">{book.category}</Badge>
              )}
              <h1 className="text-2xl font-bold">{book.title}</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-1">
                <User className="h-4 w-4" /> {book.author}
              </p>
            </div>

            {book.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              {book.isbn && (
                <div>
                  <p className="text-xs text-muted-foreground">ISBN</p>
                  <p className="font-medium">{book.isbn}</p>
                </div>
              )}
              {book.shelf_location && (
                <div>
                  <p className="text-xs text-muted-foreground">Shelf location</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {book.shelf_location}
                  </p>
                </div>
              )}
            </div>

            {/* Availability + actions */}
            <div className="space-y-3 pt-2">
              {hasPhysical && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${physAvail ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <BookIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Physical copy</p>
                        <p className="text-xs text-muted-foreground">
                          {physAvail
                            ? `${book.available_physical} of ${book.total_physical} available`
                            : 'All copies borrowed'}
                        </p>
                      </div>
                    </div>
                    {physAvail ? (
                      <Button
                        size="sm"
                        onClick={() => borrowMutation.mutate('physical')}
                        disabled={borrowMutation.isPending}
                      >
                        {borrowMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Borrow physical
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reserveMutation.mutate('physical')}
                        disabled={reserveMutation.isPending}
                      >
                        <Bookmark className="h-4 w-4 mr-1" />
                        Reserve
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {hasDigital && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${digAvail ? 'bg-secondary/20 text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Digital e-book</p>
                        <p className="text-xs text-muted-foreground">
                          {digAvail
                            ? `${book.available_digital} of ${book.total_digital} licences available`
                            : 'All licences in use'}
                        </p>
                      </div>
                    </div>
                    {digAvail ? (
                      <Button
                        size="sm"
                        onClick={() => borrowMutation.mutate('digital')}
                        disabled={borrowMutation.isPending}
                      >
                        {borrowMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Borrow digital
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reserveMutation.mutate('digital')}
                        disabled={reserveMutation.isPending}
                      >
                        <Bookmark className="h-4 w-4 mr-1" />
                        Reserve
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {profile && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your loan period is {profile.loan_period_days} days.
                  {profile.fine_balance && profile.fine_balance >= 50 && (
                    <span className="text-destructive font-medium">
                      {' '}Your fine balance (GHS {profile.fine_balance}) blocks borrowing.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
