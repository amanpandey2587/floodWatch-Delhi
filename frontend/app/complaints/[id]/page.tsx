'use client';

import ComplaintDetail from '@/components/ComplaintDetail';

interface PageProps {
  params: {
    id: string | string[];
  };
}

export default function TrackComplaintDetailPage({ params }: PageProps) {
  const complaintId = Array.isArray(params.id) ? params.id.join('/') : params.id;
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12">
      <ComplaintDetail complaintId={complaintId} />
    </div>
  );
}
