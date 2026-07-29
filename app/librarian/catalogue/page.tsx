'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LibrarianCatalogueRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.push('/librarian');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
