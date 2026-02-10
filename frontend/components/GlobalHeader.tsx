'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Moon, Sun, Shield } from 'lucide-react';

export default function GlobalHeader() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const enabled = stored ? stored === 'dark' : prefersDark;
    setIsDark(enabled);
    document.documentElement.classList.toggle('dark', enabled);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-black">FloodWatch</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Delhi Response Grid</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-semibold">
          <Link href="/map" className="text-slate-600 dark:text-slate-300 hover:text-cyan-500">Live Map</Link>
          <Link href="/failsafe" className="text-slate-600 dark:text-slate-300 hover:text-cyan-500">Flood Map</Link>
          <Link href="/safe-parking" className="text-slate-600 dark:text-slate-300 hover:text-cyan-500">Safe Parking</Link>
          {!(user?.role === 'admin' || user?.role === 'ward_officer' || user?.role === 'ward_admin') && (
            <>
              <Link href="/complaints/file" className="text-slate-600 dark:text-slate-300 hover:text-cyan-500">File Complaint</Link>
              <Link href="/complaints" className="text-slate-600 dark:text-slate-300 hover:text-cyan-500">My Complaints</Link>
            </>
          )}
          {(user?.role === 'admin' || user?.role === 'ward_officer' || user?.role === 'ward_admin') && (
            <>
              <Link href="/admin" className="text-amber-600 dark:text-amber-300 hover:text-amber-500">Admin Dashboard</Link>
              <Link href="/admin/complaints" className="text-amber-600 dark:text-amber-300 hover:text-amber-500">Resolve Complaints</Link>
              <Link href="/socialMediaPanel" className="text-amber-600 dark:text-amber-300 hover:text-amber-500">Social Monitor</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>
          {user ? (
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold uppercase tracking-widest"
            >
              Logout
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                Sign In
              </Link>
              <Link href="/sign-up" className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
