'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { QuestionBankView } from '@/features/question-bank/QuestionBankView';

export default function QuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const status = searchParams.get('status') || 'all';

  if (!currentUser) return null;

  return (
    <QuestionBankView
      currentUser={currentUser}
      initialStatus={status}
      onViewQuestion={(qId) => router.push(`/questions/${qId}`)}
      onEditQuestion={(qId) => router.push(`/questions/${qId}/edit`)}
      onCreateQuestion={() => router.push('/questions/create')}
    />
  );
}
