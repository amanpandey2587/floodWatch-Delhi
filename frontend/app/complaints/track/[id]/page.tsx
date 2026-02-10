'use client';

import { use } from 'react';
import ComplaintDetail from '@/components/ComplaintDetail';
import { useParams } from 'next/navigation';

export default function TrackComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = useParams();
  console.log("id is ",id);
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12">
      <ComplaintDetail complaintId={id} />
    </div>
  );
}
