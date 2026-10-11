'use client';

import { signIn } from 'next-auth/react';

export default function SignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('discord', { callbackUrl: '/play' })}
      className="inline-block rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white"
    >
      Sign in with Discord
    </button>
  );
}