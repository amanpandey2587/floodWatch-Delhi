'use client';

import { use } from 'react';
import ComplaintDetail from '@/components/ComplaintDetail';

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <ComplaintDetail complaintId={id} />
    </div>
  );
}
