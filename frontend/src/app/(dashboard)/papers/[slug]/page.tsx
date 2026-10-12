'use client';

import { useParams } from 'next/navigation';
import { PaperWorkflowView } from '@/features/papers/PaperWorkflowView';

export default function PaperSubPage() {
  const params = useParams();
  const slug = (params.slug as string) || 'dashboard';

  const validPages = ['dashboard', 'all', 'mine', 'create', 'review', 'changes', 'approved', 'final', 'published', 'archived'] as const;
  const page = validPages.includes(slug as any) ? (slug as typeof validPages[number]) : 'dashboard';

  return <PaperWorkflowView page={page} />;
}
