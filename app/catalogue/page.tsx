'use client';

import { useState, useMemo } from 'react';
import { Search, BookOpen, Filter } from 'lucide-react';
import { AppShell } from '@/components/providers/app-shell';
import { BookCard } from '@/components/books/book-card';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import type { Book } from '@/lib/database.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categories = [
  'All',
  'Computer Science',
  'Engineering',
  'Sciences',
  'Medicine',
  'Business',
  'Humanities',
];

export default function CataloguePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [availability, setAvailability] = useState('all');

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Book[];
    },
  });

  const filtered = useMemo<Book[]>(() => {
    return books.filter((b: Book) => {
      const matchesSearch =
        !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.author ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (b.isbn ?? '').includes(search);
      const matchesCat = category === 'All' || b.category === category;
      const matchesAvail =
        availability === 'all' ||
        (availability === 'physical' && b.available_physical > 0) ||
        (availability === 'digital' && b.available_digital > 0) ||
        (availability === 'available' && (b.available_physical > 0 || b.available_digital > 0));
      return matchesSearch && matchesCat && matchesAvail;
    });
  }, [books, search, category, availability]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Catalogue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse {books.length} titles across physical and digital formats.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, author, or ISBN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/5] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No books match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((book: Book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
