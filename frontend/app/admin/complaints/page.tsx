'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useComplaintAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Complaint {
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  ward_number: number;
  status: string;
  priority: string;
  created_at: string;
  eta_hours?: number;
}

export default function AdminComplaintsPage() {
  const { user } = useAuth();
  const complaintAPI = useComplaintAPI();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = user?.role || 'citizen';
  const wardNumber = user?.ward_number;

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: { ward_number?: number; status?: string } = {};
      if (role === 'ward_officer' || role === 'ward_admin') {
        if (wardNumber) filters.ward_number = wardNumber;
      }
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      const data = await complaintAPI.getComplaints(filters);
      setComplaints(Array.isArray(data.complaints) ? data.complaints : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus]);

  const counts = useMemo(() => {
    return complaints.reduce(
      (acc, c) => {
        acc.total += 1;
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [complaints]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading complaints...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-6 text-red-700 dark:text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 mt-1" />
            <div>
              <h1 className="text-lg font-semibold mb-2">Failed to load complaints</h1>
              <p className="text-sm mb-4">{error}</p>
              <button
                onClick={fetchComplaints}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Resolve Complaints</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Update status, add comments, and set estimated resolution time.
            </p>
          </div>
          <button
            onClick={fetchComplaints}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'pending', 'acknowledged', 'in_progress', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                filterStatus === status
                  ? 'bg-cyan-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {status === 'all' ? `All (${counts.total || 0})` : `${status.replace('_', ' ')} (${counts[status] || 0})`}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Complaint
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ward
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  ETA
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {complaints.map((complaint) => (
                <tr key={complaint.complaint_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {complaint.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {complaint.complaint_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {complaint.ward_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 capitalize">
                    {complaint.status.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {typeof complaint.eta_hours === 'number' ? `${complaint.eta_hours}h` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/admin/complaints/${complaint.complaint_id}`}
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-semibold"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {complaints.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                    No complaints found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
