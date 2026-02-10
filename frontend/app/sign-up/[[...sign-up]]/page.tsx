'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function SignUpPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'ward_officer' | 'admin'>('citizen');
  const [wardNumber, setWardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const passwordBytes = new TextEncoder().encode(password);
      if (passwordBytes.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      let safePassword = password;
      if (passwordBytes.length > 72) {
        safePassword = new TextDecoder().decode(passwordBytes.slice(0, 72));
      }
      const ward = role === 'ward_officer' && wardNumber ? Number(wardNumber) : undefined;
      await register(name, email, safePassword, role, ward);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-8 shadow-xl">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Create Account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Join FloodWatch to report and track incidents.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="citizen">Citizen</option>
              <option value="ward_officer">Ward Officer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {role === 'ward_officer' && (
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Ward Number</label>
              <input
                type="number"
                min="1"
                max="272"
                value={wardNumber}
                onChange={(e) => setWardNumber(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="e.g. 44"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-cyan-600 dark:text-cyan-400 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
