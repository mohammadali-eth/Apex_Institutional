'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/features/auth/LoginPage';

export default function LoginRoutePage() {
  const router = useRouter();
  const { isAuthenticated, backendUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const destination = backendUser?.portal_route || '/dashboard';
      router.replace(destination);
    }
  }, [isAuthenticated, backendUser, router]);

  return (
    <LoginPage
      onSuccess={(status) => {
        if (status?.portalRoute) {
          router.push(status.portalRoute);
        } else {
          router.push('/dashboard');
        }
      }}
    />
  );
}
