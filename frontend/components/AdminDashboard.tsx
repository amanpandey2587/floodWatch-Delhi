'use client';

import { useState, useEffect } from 'react';
import { useAdminAPI } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';
import AdminStats from './AdminStats';
import AdminComplaints from './AdminComplaints';
import NotificationBroadcast from './NotificationBroadcast';
import SOSBroadcast from './SOSBroadcast';
import { AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { userId } = useAuth();
  const { user } = useUser();
  const adminAPI = useAdminAPI();
  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TEMPORARY: Open access for testing
  const role = "ward_admin";
  const wardNumber = 44;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching dashboard for ward:', wardNumber);
        
        const dashboardData = await adminAPI.getDashboard(wardNumber);
        
        console.log('Dashboard data received:', dashboardData);
        
        // Set stats with defaults
        setStats(dashboardData.stats || {
          total_complaints: 0,
          pending: 0,
          acknowledged: 0,
          in_progress: 0,
          resolved: 0,
          high_priority: 0,
          avg_response_time: null,
          satisfaction_rate: null,
        });
        
        // Set complaints (ensure it's an array)
        if (Array.isArray(dashboardData.recent_complaints)) {
          setComplaints(dashboardData.recent_complaints);
        } else {
          console.warn('recent_complaints is not an array:', dashboardData.recent_complaints);
          setComplaints([]);
        }
      } catch (err: any) {
        console.error('Error fetching dashboard:', err);
        
        // Parse error message
        let errorMessage = 'Failed to load dashboard';
        
        if (err.response?.data?.detail) {
          if (Array.isArray(err.response.data.detail)) {
            // Validation errors
            const errors = err.response.data.detail.map((e: any) => 
              `${e.loc?.join('.')} - ${e.msg}`
            ).join(', ');
            errorMessage = `Validation Error: ${errors}`;
          } else if (typeof err.response.data.detail === 'string') {
            errorMessage = err.response.data.detail;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [wardNumber]); // Only depend on wardNumber

  // Fetch wards for SOS broadcast
  useEffect(() => {
    const fetchWards = async () => {
      try {
        const response = await fetch('http://localhost:8000/wards');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch wards: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Wards data:', data);
        
        if (Array.isArray(data)) {
          setWards(data);
        } else {
          console.warn('Wards data is not an array:', data);
          setWards([]);
        }
      } catch (error) {
        console.error('Error fetching wards:', error);
        setWards([]);
      }
    };

    fetchWards();
  }, []);

  const handleRefresh = async () => {
    try {
      setError(null);
      
      const dashboardData = await adminAPI.getDashboard(wardNumber);
      
      setStats(dashboardData.stats || {
        total_complaints: 0,
        pending: 0,
        acknowledged: 0,
        in_progress: 0,
        resolved: 0,
        high_priority: 0,
        avg_response_time: null,
        satisfaction_rate: null,
      });
      
      if (Array.isArray(dashboardData.recent_complaints)) {
        setComplaints(dashboardData.recent_complaints);
      } else {
        setComplaints([]);
      }
    } catch (err: any) {
      console.error('Error refreshing dashboard:', err);
      
      let errorMessage = 'Failed to refresh dashboard';
      
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      
      setError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Admin Dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Ward {wardNumber}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-8 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Error Loading Dashboard</h3>
                <p className="text-sm mb-4">{error}</p>
                
                <div className="bg-red-100 border border-red-300 rounded p-3 mb-4 text-xs">
                  <strong>Troubleshooting:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Make sure the backend server is running on http://localhost:8000</li>
                    <li>Check that the /api/admin/dashboard endpoint is accessible</li>
                    <li>Verify ward number {wardNumber} exists in the database</li>
                    <li>Check browser console for detailed error logs</li>
                  </ul>
                </div>

                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600 text-lg">
                Ward {wardNumber} Management • FloodWatch Delhi
              </p>
            </div>
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <p className="text-sm font-medium">Role: Ward Admin</p>
              <p className="text-xs text-blue-600">Testing Mode - Open Access</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {stats && <AdminStats stats={stats} />}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Broadcast Controls */}
          <div className="space-y-8">
            <NotificationBroadcast onSuccess={handleRefresh} />
            <SOSBroadcast wards={wards.map((w) => ({ id: w.id, name: w.name }))} />
          </div>

          {/* Right Column - Complaints Management */}
          <div>
            <AdminComplaints complaints={complaints} />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Testing Mode:</strong> Admin access is currently open for all users to preview the dashboard. 
            In production, this will be restricted to authorized administrators only.
          </p>
        </div>
      </div>
    </div>
  );
}