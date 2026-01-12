'use client';

import ComplaintDetail from '@/components/ComplaintDetail';
import { use } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TrackComplaintDetailPage({ params }: PageProps) {
  // Use React's use() hook to unwrap the Promise
  const { id } = use(params);
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <ComplaintDetail complaintId={id} />
    </div>
  );
}