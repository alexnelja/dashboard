'use client';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import type { UserRole } from '@/lib/types';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        role,
        company_name: companyName,
        country: 'ZA',
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    router.push('/map');
    router.refresh();
  }

  const roles: { value: UserRole; label: string; desc: string }[] = [
    { value: 'buyer', label: 'Buyer', desc: 'I want to purchase materials' },
    { value: 'seller', label: 'Seller', desc: 'I have materials to sell' },
    { value: 'both', label: 'Both', desc: 'I buy and sell materials' },
  ];

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mx-auto mb-4">
          <span className="text-black text-lg font-bold">M</span>
        </div>
        <h1 className="text-xl font-bold">Create your account</h1>
        <p className="text-gray-400 text-sm mt-1">Join the marketplace</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="company" className="block text-sm text-gray-400 mb-1">Company name</label>
          <input
            id="company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
            placeholder="Your company"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-sm text-gray-400 mb-1">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">I am a</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  role === r.value
                    ? 'border-white bg-gray-800 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-white hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
