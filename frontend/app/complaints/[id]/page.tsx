'use client';

import ComplaintDetail from '@/components/ComplaintDetail';
import { useParams } from 'next/navigation';
import { use } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TrackComplaintDetailPage({ params }: PageProps) {
  // Use React's use() hook to unwrap the Promise
  // const { id } = use(params);
  const {id}=useParams();
  console.log(id);
  console.log(params)
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12">
      <ComplaintDetail complaintId={id} />
    </div>
  );
}
