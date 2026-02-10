'use client';

import { useParams } from 'next/navigation';
import ComplaintDetail from '@/components/ComplaintDetail';

export default function AdminComplaintDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10">
      {id ? (
        <ComplaintDetail complaintId={id} />
      ) : (
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-6 py-4 rounded-lg">
            Invalid complaint ID.
          </div>
        </div>
      )}
    </div>
  );
}
