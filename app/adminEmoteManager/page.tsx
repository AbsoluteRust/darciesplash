// app/adminEmoteManager/page.tsx
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import AdminEmoteManager from './AdminEmoteManager';

export const dynamic = 'force-dynamic';

export default async function AdminEmoteManagerPage() {
  const session = await requireAdmin();
  if (!session) redirect('/');
  return <AdminEmoteManager />;
}