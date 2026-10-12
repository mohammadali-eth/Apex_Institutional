'use client';

import { useParams } from 'next/navigation';
import { EnterpriseModule } from '@/features/admin/EnterpriseModule';

export default function RoleDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return <EnterpriseModule page="role-details" selectedId={id} />;
}
