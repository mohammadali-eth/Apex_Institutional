'use client';

import { useRouter } from 'next/navigation';
import { DashboardView } from '@/features/dashboard/DashboardView';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <DashboardView
      onNavigate={(route) => {
        router.push(`/${route}`);
      }}
    />
  );
}
