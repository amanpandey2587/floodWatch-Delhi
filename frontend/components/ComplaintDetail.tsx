'use client';

import { useState, useEffect } from 'react';
import { useComplaintAPI } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Star,
  Send,
  ArrowLeft,
} from 'lucide-react';

interface Complaint {
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  ward_number: number;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  location?: { latitude: number; longitude: number };
  attachments?: string[];
  timeline?: Array<{
    timestamp: string;
    status: string;
    remarks: string;
    updated_by: string;
  }>;
  resolution?: string;
  rating?: number;
  feedback?: string;
  response_time_hours?: number;
}

interface ComplaintDetailProps {
  complaintId: string;
  onUpdate?: () => void;
}

export default function ComplaintDetail({ complaintId, onUpdate }: ComplaintDetailProps) {
  const router = useRouter();
  const { userId, sessionClaims } = useAuth();
  const complaintAPI = useComplaintAPI();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusRemarks, setStatusRemarks] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resolution, setResolution] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [updating, setUpdating] = useState(false);

  const role = (sessionClaims?.metadata?.role as string) || 'citizen';
  const isAdmin = role === 'ward_admin' || role === 'admin';
  const isOwner = complaint?.created_by === userId;

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await complaintAPI.getComplaint(complaintId);
        setComplaint(data);
        setSelectedStatus(data.status);
        if (data.resolution) setResolution(data.resolution);
        if (data.rating) setRating(data.rating);
        if (data.feedback) setFeedback(data.feedback);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load complaint');
        console.error('Error fetching complaint:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaint();
  }, [complaintId]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !statusRemarks.trim()) return;
    
    try {
      setUpdating(true);
      await complaintAPI.updateStatus(complaintId, selectedStatus, statusRemarks);
      const updated = await complaintAPI.getComplaint(complaintId);
      setComplaint(updated);
      setStatusRemarks('');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!resolution.trim()) return;
    
    try {
      setUpdating(true);
      await complaintAPI.resolveComplaint(complaintId, resolution);
      const updated = await complaintAPI.getComplaint(complaintId);
      setComplaint(updated);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resolve complaint');
    } finally {
      setUpdating(false);
    }
  };

  const handleRating = async () => {
    if (rating === 0) return;
    
    try {
      setUpdating(true);
      await complaintAPI.rateComplaint(complaintId, rating, feedback);
      const updated = await complaintAPI.getComplaint(complaintId);
      setComplaint(updated);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit rating');
    } finally {
      setUpdating(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
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
          <p className="text-gray-600">Loading complaint...</p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        {error || 'Complaint not found'}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{complaint.title}</h1>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
                  complaint.status
                )}`}
              >
                {complaint.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-gray-500">ID: {complaint.complaint_id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Ward {complaint.ward_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Created: {formatDate(complaint.created_at)}</span>
          </div>
          <div>
            <span className="capitalize">Category: {complaint.category}</span>
          </div>
          <div>
            <span className="capitalize">Priority: {complaint.priority}</span>
          </div>
          {complaint.response_time_hours && (
            <div>
              Response Time: {complaint.response_time_hours.toFixed(1)} hours
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-3">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
        </div>

        {complaint.attachments && complaint.attachments.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-3">Attachments</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {complaint.attachments.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Attachment ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                />
              ))}
            </div>
          </div>
        )}

        {complaint.timeline && complaint.timeline.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <div className="space-y-4">
              {complaint.timeline
                .slice()
                .reverse()
                .map((entry, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      {idx < complaint.timeline!.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(entry.status)}`}>
                          {entry.status.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">{formatDate(entry.timestamp)}</span>
                      </div>
                      <p className="text-gray-700">{entry.remarks}</p>
                      <p className="text-xs text-gray-500 mt-1">by {entry.updated_by}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {isAdmin && complaint.status !== 'resolved' && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Update Status</h2>
            <div className="space-y-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="pending">Pending</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <textarea
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder="Add remarks..."
                rows={3}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={handleStatusUpdate}
                disabled={updating || !statusRemarks.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        )}

        {isAdmin && complaint.status === 'in_progress' && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Resolve Complaint</h2>
            <div className="space-y-4">
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Enter resolution details..."
                rows={4}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={handleResolve}
                disabled={updating || !resolution.trim()}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? 'Resolving...' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        )}

        {complaint.resolution && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-3">Resolution</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{complaint.resolution}</p>
          </div>
        )}

        {isOwner && complaint.status === 'resolved' && !complaint.rating && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Rate This Complaint</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback..."
                rows={3}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={handleRating}
                disabled={updating || rating === 0}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {updating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        )}

        {complaint.rating && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-3">Rating</h2>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${complaint.rating! >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                />
              ))}
              <span className="ml-2 text-gray-600">({complaint.rating}/5)</span>
            </div>
            {complaint.feedback && (
              <p className="text-gray-700 mt-2">{complaint.feedback}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
