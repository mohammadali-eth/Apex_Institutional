'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { QuestionEditForm } from '@/features/question-bank/QuestionEditForm';

export default function QuestionEditPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const questionId = params.id as string;

  if (!currentUser || !questionId) return null;

  return (
    <QuestionEditForm
      questionId={questionId}
      currentUser={currentUser}
      onCancel={() => router.push('/questions')}
      onSaved={(savedId) => router.push(`/questions/${savedId}`)}
    />
  );
}
