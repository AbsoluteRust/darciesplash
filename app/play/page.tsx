import { auth } from '@/auth';
import PlayHub from './PlayHub';

export const metadata = { title: 'Play | Folly' };

export default async function PlayPage() {
  const session = await auth();
  return <PlayHub signedIn={!!session?.user} />;
}