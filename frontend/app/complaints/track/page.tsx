'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, AlertCircle } from 'lucide-react';

export default function TrackComplaintPage() {
  const router = useRouter();
  const [complaintId, setComplaintId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintId.trim()) {
      setError('Please enter a complaint ID');
      return;
    }
    router.push(`/complaints/track/${complaintId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8 border border-slate-200 dark:border-slate-800">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 text-center">Track Complaint</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center">
            Enter your complaint ID to track its status
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label htmlFor="complaint_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Complaint ID
              </label>
              <input
                type="text"
                id="complaint_id"
                value={complaintId}
                onChange={(e) => {
                  setComplaintId(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="e.g., COMP-ABC12345"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Track Complaint
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
