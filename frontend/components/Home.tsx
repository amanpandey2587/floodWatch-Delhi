'use client';

import Link from 'next/link';
import {
  MapPin,
  Navigation,
  BarChart3,
  MessageSquare,
  Search,
  AlertTriangle,
  Car,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10"></div>
        <div className="absolute top-32 -left-20 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl dark:bg-blue-600/10"></div>
        <div className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/10"></div>
      </div>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40 px-4 py-1 text-xs font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
              Live Monitoring Active
            </p>
            <h1 className="mt-6 text-4xl md:text-5xl font-black leading-tight">
              Real-time Flood Intelligence for a Safer Delhi
            </h1>
            <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-300">
              Track waterlogging, find safe routes, and reach elevated parking with one unified response map.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/map"
                className="px-6 py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-lg"
              >
                Launch Live Map
              </Link>
              <Link
                href="/failsafe"
                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-semibold"
              >
                Open Flood Map
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl">
              <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                <Navigation className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
              </div>
              <h3 className="mt-4 font-bold">Safe Routes</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Gradient trail highlights increasing flood risk along your path.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <h3 className="mt-4 font-bold">Ward Analytics</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Readiness scores and pump availability for every ward.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <Car className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <h3 className="mt-4 font-bold">Safe Parking</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Locate elevated, multi-level parking near you.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-xl">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
              <h3 className="mt-4 font-bold">Alerts & SOS</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Broadcast critical warnings to ward residents instantly.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/complaints/file" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-6 shadow-lg">
              <MessageSquare className="h-6 w-6 text-cyan-600 dark:text-cyan-300" />
              <h3 className="mt-3 font-bold">File a Complaint</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Report waterlogging or infrastructure issues in seconds.
              </p>
            </Link>
            <Link href="/complaints/track" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-6 shadow-lg">
              <Search className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
              <h3 className="mt-3 font-bold">Track Status</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Monitor SLA progress and resolution updates.
              </p>
            </Link>
            <Link href="/safe-parking" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-6 shadow-lg">
              <MapPin className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
              <h3 className="mt-3 font-bold">Find Parking</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Get directions to safe elevated lots.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
