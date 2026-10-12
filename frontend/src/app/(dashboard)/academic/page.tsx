'use client';

import { useRouter } from 'next/navigation';
import { AcademicStructureView } from '@/features/academic/AcademicStructureView';

export default function AcademicPage() {
  const router = useRouter();

  return (
    <AcademicStructureView
      initialTab="departments"
      onNavigateQuestionBank={() => router.push('/questions')}
      onNavigateGenerator={() => router.push('/generator')}
    />
  );
}
