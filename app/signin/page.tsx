'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [method, setMethod] = useState<'oauth' | 'dm'>('oauth');
  
  // DM Login State
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    if (!userId) return setError("Please enter your Discord User ID");
    setLoading(true);
    setError(null);

    // Generate a random session ID for this specific login attempt
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId: newSessionId }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      
      setStep(2);
      setCountdown(30);
      
      // Start countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setStep(1);
            setError("Code expired. Please try again.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) return setError("Please enter the 6-digit code");
    setLoading(true);
    setError(null);

    try {
      const res = await signIn('discord-dm', {
        sessionId,
        code,
        redirect: false,
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-[#0a0a14] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 text-center mb-8 uppercase tracking-widest">
          Sign In
        </h1>

        {/* Method Toggle */}
        <div className="flex bg-black/50 p-1 rounded-xl mb-8 border border-white/10">
          <button
            onClick={() => setMethod('oauth')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${method === 'oauth' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Standard Login
          </button>
          <button
            onClick={() => setMethod('dm')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${method === 'dm' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Login via Bot DM
          </button>
        </div>

        {method === 'oauth' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-white/60 text-center mb-2">
              The standard secure OAuth method. Allows the site to read your username, avatar, and server roles.
            </p>
            <button
              onClick={() => signIn('discord', { callbackUrl: '/' })}
              className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
            >
              Continue with Discord
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-white/60 text-center mb-2">
              For privacy. We will DM you a 6-digit code. We never see your password or OAuth token.
            </p>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {step === 1 ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Discord User ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 164429062238896129"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                  <p className="text-[10px] text-white/40 mt-1">Right-click yourself in Discord → Copy User ID</p>
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={loading || !userId}
                  className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'DM me a code'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex justify-between">
                    <span>6-Digit Code</span>
                    <span className="text-indigo-400 font-mono">{countdown}s</span>
                  </label>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-center tracking-[0.5em] text-2xl font-mono text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-2 text-sm text-white/40 hover:text-white transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}