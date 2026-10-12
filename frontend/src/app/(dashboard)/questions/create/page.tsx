'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { QuestionEditForm } from '@/features/question-bank/QuestionEditForm';

export default function CreateQuestionPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <QuestionEditForm
      currentUser={currentUser}
      onCancel={() => router.push('/questions')}
      onSaved={(savedId) => router.push(`/questions/${savedId}`)}
    />
  );
}
