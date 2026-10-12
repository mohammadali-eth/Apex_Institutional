'use client';

import { useParams } from 'next/navigation';
import { EnterpriseModule } from '@/features/admin/EnterpriseModule';

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return <EnterpriseModule page="user-details" selectedId={id} />;
}
