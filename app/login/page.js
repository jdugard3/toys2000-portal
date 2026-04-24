'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/catalog';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'

  const supabase = createBrowserClient();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
        router.push(redirect);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        });
        if (error) throw error;
        toast.success('Check your email to confirm your account.');
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Enter your email address first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent. Check your inbox.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/">
            <Image
              src="/logos/toys_2000_logo.png"
              alt="Toys2000"
              width={180}
              height={60}
              className="h-14 w-auto object-contain"
              priority
            />
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/[0.06] p-8">
          <h1
            className="text-2xl font-bold text-center mb-1"
            style={{ fontFamily: "'Baloo 2', cursive" }}
          >
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-[#5f6980] text-center mb-6">
            {mode === 'login'
              ? 'Sign in to your wholesale account'
              : 'Set up your portal login'}
          </p>

          {errorParam === 'auth_callback_failed' && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Email confirmation failed. Please try logging in again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1d26] mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f15a24]/30 focus:border-[#f15a24] transition-colors"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1d26] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f15a24]/30 focus:border-[#f15a24] transition-colors"
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-[#00aeef] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #f15a24, #ff7a4d)',
                boxShadow: '0 4px 12px rgba(241, 90, 36, 0.25)',
                fontFamily: "'Baloo 2', cursive",
              }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#5f6980]">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <a
                  href={process.env.NEXT_PUBLIC_MT_B2B_SIGNUP_URL || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f15a24] font-semibold hover:underline"
                >
                  Register with Toys2000
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-[#f15a24] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#5f6980] mt-6">
          Toys2000 Wholesale Portal &mdash; For approved retailers only
        </p>
      </div>
    </div>
  );
}
