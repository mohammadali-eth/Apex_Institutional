'use client';

import { useParams } from 'next/navigation';
import { EnterpriseModule } from '@/features/admin/EnterpriseModule';

export default function ExaminationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return <EnterpriseModule page="exam-details" selectedId={id} />;
}
