'use client';

import NewFileComplaint from '@/components/NewFileComplaint';

export default function FileComplaintPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 py-12 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <NewFileComplaint />
      </div>
    </div>
  );
}
