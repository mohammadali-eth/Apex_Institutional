'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, backendUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (backendUser?.portal_route) {
        router.replace(backendUser.portal_route);
      } else {
        router.replace('/dashboard');
      }
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, backendUser, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-transparent relative z-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-primary border-t-transparent" />
    </div>
  );
}
