// lib/admin.ts
import { auth } from '@/auth';

export const ADMIN_IDS = new Set([
  '665898420447215647',
  '164429062238896129',
  '423726271676284939',
]);

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !ADMIN_IDS.has(session.user.id)) return null;
  return session;
}