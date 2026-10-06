'use client';

import { useRouter } from 'next/navigation';
import { LoginPage } from '@/features/auth/LoginPage';

export default function LoginRoutePage() {
  const router = useRouter();

  return (
    <LoginPage
      onSuccess={() => {
        router.push('/dashboard');
      }}
    />
  );
}
