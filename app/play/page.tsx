import Link from 'next/link';
import { auth } from '@/auth';
import PlayButton from './PlayButton';

export const metadata = { title: 'Play | Folly' };

export default async function PlayPage() {
  const session = await auth();
  const signedIn = !!session?.user;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Play</h1>

      {signedIn ? (
        <PlayButton />
      ) : (
        <div className="text-center space-y-4">
          <p className="opacity-80">Sign in with Discord to play.</p>
          <Link
            href="/signin"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white"
          >
            Sign in with Discord
          </Link>
        </div>
      )}
    </main>
  );
}