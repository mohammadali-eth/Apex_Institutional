import { SuperAdminDashboard } from '@/features/admin/SuperAdminDashboard';

export const metadata = {
  title: 'Platform Super Admin Portal | Apex QPMS',
  description: 'Multi-tenant university governance, administrator provisioning, and platform security oversight.',
};

export default function SuperAdminPage() {
  return <SuperAdminDashboard />;
}
