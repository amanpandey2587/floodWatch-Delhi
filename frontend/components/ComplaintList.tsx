'use client';

import { useState, useEffect } from 'react';
import { useComplaintAPI } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Clock, MapPin, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';

interface Complaint {
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  ward_number: number;
  status: string;
  priority: string;
  created_at: string;
  location?: { latitude: number; longitude: number };
}

export default function ComplaintList({ filterStatus }: { filterStatus?: string }) {
  const { userId, sessionClaims } = useAuth();
  const complaintAPI = useComplaintAPI();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = (sessionClaims?.metadata?.role as string) || 'citizen';
  const wardNumber = sessionClaims?.metadata?.ward_number as number | undefined;

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const filters: any = {};
        if (role === 'ward_admin' && wardNumber) {
          filters.ward_number = wardNumber;
        }
        if (filterStatus) {
          filters.status = filterStatus;
        }
        
        const result = await complaintAPI.getComplaints(filters);
        let complaintsList = result.complaints || result || [];
        
        if (filterStatus) {
          complaintsList = complaintsList.filter((c: Complaint) => c.status === filterStatus);
        }
        
        setComplaints(complaintsList);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load complaints');
        console.error('Error fetching complaints:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchComplaints();
    }
  }, [userId, role, wardNumber, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'acknowledged':
        return <AlertCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Loader className="w-4 h-4 animate-spin" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading complaints...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">No complaints found</p>
        <Link
          href="/complaints/file"
          className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium"
        >
          File a new complaint
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {complaints.map((complaint) => (
        <Link
          key={complaint.complaint_id}
          href={`/complaints/${complaint.complaint_id}`}
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{complaint.title}</h3>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full border flex items-center gap-1 ${getStatusColor(
                    complaint.status
                  )}`}
                >
                  {getStatusIcon(complaint.status)}
                  {complaint.status.replace('_', ' ').toUpperCase()}
                </span>
                <div
                  className={`w-3 h-3 rounded-full ${getPriorityColor(complaint.priority)}`}
                  title={`Priority: ${complaint.priority}`}
                />
              </div>
              <p className="text-gray-600 mb-3 line-clamp-2">{complaint.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Ward {complaint.ward_number}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(complaint.created_at)}
                </span>
                <span className="capitalize">{complaint.category}</span>
              </div>
            </div>
            <div className="ml-4 text-right">
              <span className="text-sm font-mono text-gray-500">{complaint.complaint_id}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
