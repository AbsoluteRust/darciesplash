import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import AdminBadgeManager from './AdminBadgeManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireAdmin();
  if (!session) redirect('/');
  return <AdminBadgeManager />;
}