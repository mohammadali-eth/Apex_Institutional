'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { QuestionDetailsView } from '@/features/question-bank/QuestionDetailsView';

export default function QuestionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const questionId = params.id as string;

  if (!currentUser || !questionId) return null;

  return (
    <QuestionDetailsView
      questionId={questionId}
      currentUser={currentUser}
      onBack={() => router.push('/questions')}
      onEdit={(qId) => router.push(`/questions/${qId}/edit`)}
      onQuestionUpdated={() => {}}
    />
  );
}
