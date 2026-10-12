'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PaperHistoryView } from '@/features/history/PaperHistoryView';
import { PreviousPaper } from '@/types';

export default function HistoryPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const handleUseReference = (paper: PreviousPaper) => {
    // Navigate to generator with reference
    router.push('/generator');
  };

  return (
    <PaperHistoryView
      currentUser={currentUser}
      onUseAsReferenceInGenerator={handleUseReference}
    />
  );
}
