'use client';

import { useState } from 'react';
import ComplaintList from '@/components/ComplaintList';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function ComplaintsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Complaints</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">Track and manage your filed complaints</p>
          </div>
          <Link
            href="/complaints/file"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            File New Complaint
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'acknowledged', 'in_progress', 'resolved'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <ComplaintList filterStatus={filterStatus === 'all' ? undefined : filterStatus} />
      </div>
    </div>
  );
}
