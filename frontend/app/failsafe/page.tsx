import dynamic from 'next/dynamic';

const FailsafeClient = dynamic(() => import('./FailsafeClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-slate-600 dark:text-slate-300">Loading map...</div>
    </div>
  ),
});

export default function FailsafePage() {
  return <FailsafeClient />;
}
