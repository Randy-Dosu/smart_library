'use client';

import Link from 'next/link';
import { Book as BookIcon, Smartphone, Check } from 'lucide-react';
import type { Book } from '@/lib/database.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function BookCard({ book }: { book: Book }) {
  const hasPhysical = book.type !== 'digital';
  const hasDigital = book.type !== 'physical';
  const physAvail = book.available_physical > 0;
  const digAvail = book.available_digital > 0;
  const anyAvail = physAvail || digAvail;

  return (
    <Link href={`/catalogue/${book.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 group h-full">
        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt={book.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <BookIcon className="h-12 w-12" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasPhysical && (
              <Badge
                className={physAvail ? 'bg-primary/90 text-primary-foreground' : 'bg-muted/90 text-muted-foreground'}
                variant="secondary"
              >
                <BookIcon className="h-3 w-3 mr-1" />
                {physAvail ? `${book.available_physical} physical` : 'No physical'}
              </Badge>
            )}
            {hasDigital && (
              <Badge
                className={digAvail ? 'bg-secondary/90 text-secondary-foreground' : 'bg-muted/90 text-muted-foreground'}
                variant="secondary"
              >
                <Smartphone className="h-3 w-3 mr-1" />
                {digAvail ? `${book.available_digital} digital` : 'No digital'}
              </Badge>
            )}
          </div>
          {!anyAvail && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Badge variant="destructive">Unavailable</Badge>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-medium text-sm line-clamp-2 leading-snug">{book.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{book.author}</p>
          {book.category && (
            <p className="text-[10px] text-muted-foreground mt-1">{book.category}</p>
          )}
          {anyAvail && (
            <p className="text-[10px] text-success flex items-center gap-1 mt-2">
              <Check className="h-3 w-3" /> Available now
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
