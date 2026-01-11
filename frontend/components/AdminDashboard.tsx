'use client';

import { useState, useEffect } from 'react';
import { useAdminAPI } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';
import AdminStats from './AdminStats';
import AdminComplaints from './AdminComplaints';
import NotificationBroadcast from './NotificationBroadcast';
import { Loader, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { userId } = useAuth();
  const { user } = useUser();
  const adminAPI = useAdminAPI();
  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = (user?.publicMetadata?.role as string) || 'citizen';
  const wardNumber = user?.publicMetadata?.ward_number as number | undefined;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const dashboardData = await adminAPI.getDashboard(
          role === 'ward_admin' ? wardNumber : undefined
        );
        
        setStats(dashboardData.stats || {});
        setComplaints(dashboardData.recent_complaints || []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard');
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId && (role === 'ward_admin' || role === 'admin')) {
      fetchDashboard();
    } else {
      setError('Admin access required');
      setLoading(false);
    }
  }, [userId, role, wardNumber]);

  const handleRefresh = () => {
    const fetchDashboard = async () => {
      try {
        setError(null);
        const dashboardData = await adminAPI.getDashboard(
          role === 'ward_admin' ? wardNumber : undefined
        );
        setStats(dashboardData.stats || {});
        setComplaints(dashboardData.recent_complaints || []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to refresh dashboard');
      }
    };
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        {wardNumber && (
          <p className="text-gray-600">Ward {wardNumber} Management</p>
        )}
      </div>

      {stats && <AdminStats stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <AdminComplaints complaints={complaints} />
        </div>
        <div className="lg:col-span-1">
          <NotificationBroadcast onSuccess={handleRefresh} />
        </div>
      </div>
    </div>
  );
}
