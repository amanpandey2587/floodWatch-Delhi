'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL, useAdminAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import NotificationBroadcast from './NotificationBroadcast';
import SOSBroadcast from './SOSBroadcast';
import { AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const adminAPI = useAdminAPI();
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = user?.role || 'citizen';
  const wardNumber = user?.ward_number ?? 44;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching dashboard for ward:', wardNumber);
        
        const dashboardData = await adminAPI.getDashboard(wardNumber);
        
        console.log('Dashboard data received:', dashboardData);
        
        // Data fetched for health check; dashboard renders broadcast controls only
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
        const response = await fetch(`${API_BASE_URL}/api/wards`);
        
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
      
      // Dashboard renders broadcast controls only
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 text-lg">Loading Admin Dashboard...</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Ward {wardNumber}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-6 py-8 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Error Loading Dashboard</h3>
                <p className="text-sm mb-4">{error}</p>
                


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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Admin Dashboard</h1>
              <p className="text-slate-600 dark:text-slate-300 text-lg">
                Ward {wardNumber} Management - FloodWatch Delhi
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg">
              <p className="text-sm font-medium">Role: {role}</p>
            </div>
          </div>
        </div>

        {/* Broadcast Controls */}
        <div className="space-y-8 mb-8">
          <NotificationBroadcast onSuccess={handleRefresh} />
          <SOSBroadcast wards={wards.map((w) => ({ id: w.id, name: w.name }))} />
        </div>

        {/* Footer Info */}

      </div>
    </div>
  );
}
