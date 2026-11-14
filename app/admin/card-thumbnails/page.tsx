// app/admin/card-thumbnails/page.tsx
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import AdminCardThumbEditor from './AdminCardThumbEditor';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await requireAdmin();
  if (!session) redirect('/');
  return <AdminCardThumbEditor />;
}