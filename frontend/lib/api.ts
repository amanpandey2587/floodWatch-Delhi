'use client';

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

// Helper to get user from localStorage
function getUser(): any | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

// Axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Axios interceptor for 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/sign-in';
      }
    }
    return Promise.reject(error);
  }
);

// Complaint API hook for client components
export function useComplaintAPI() {
  const getHeaders = () => {
    const token = getAuthToken();
    const user = getUser();

    return {
      'Content-Type': 'application/json',
      ...(user?.user_id && { 'X-User-ID': user.user_id }),
      ...(user?.role && { 'X-User-Role': user.role }),
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  return {
    async fileComplaint(complaintData: any) {
      const headers = getHeaders();

      const response = await axios.post(
        `${API_BASE_URL}/api/complaints`,
        complaintData,
        { headers }
      );
      return response.data;
    },

    async getComplaints(filters?: { ward_number?: number; status?: string }) {
      const headers = getHeaders();

      const params = new URLSearchParams();
      if (filters?.ward_number) params.append('ward_number', filters.ward_number.toString());
      if (filters?.status) params.append('status', filters.status);

      const response = await axios.get(
        `${API_BASE_URL}/api/complaints?${params.toString()}`,
        { headers }
      );
      return response.data;
    },

    async getComplaint(complaintId: string) {
      const response = await axios.get(`${API_BASE_URL}/api/complaints/${complaintId}`);
      return response.data;
    },

    async trackComplaint(complaintId: string) {
      const response = await axios.get(`${API_BASE_URL}/api/complaints/track/${complaintId}`);
      return response.data;
    },

    async updateStatus(complaintId: string, status: string, remarks?: string) {
      const headers = getHeaders();

      const response = await axios.put(
        `${API_BASE_URL}/api/complaints/${complaintId}/status`,
        { status, remarks },
        { headers }
      );
      return response.data;
    },

    async assignComplaint(complaintId: string, officerId: string) {
      const headers = getHeaders();

      const response = await axios.put(
        `${API_BASE_URL}/api/complaints/${complaintId}/assign`,
        { officer_id: officerId },
        { headers: { ...headers, 'X-Officer-ID': officerId } }
      );
      return response.data;
    },

    async resolveComplaint(complaintId: string, resolution: string) {
      const headers = getHeaders();

      const response = await axios.put(
        `${API_BASE_URL}/api/complaints/${complaintId}/resolve`,
        { resolution },
        { headers }
      );
      return response.data;
    },

    async rateComplaint(complaintId: string, rating: number, feedback?: string) {
      const headers = getHeaders();

      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/${complaintId}/rate`,
        { rating, feedback },
        { headers }
      );
      return response.data;
    },

    async addTimelineEntry(complaintId: string, entry: any) {
      const headers = getHeaders();

      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/${complaintId}/timeline`,
        entry,
        { headers }
      );
      return response.data;
    },

    async setComplaintETA(complaintId: string, etaHours: number, comment?: string) {
      const headers = getHeaders();

      const response = await axios.put(
        `${API_BASE_URL}/api/complaints/${complaintId}/eta`,
        { eta_hours: etaHours, comment },
        { headers }
      );
      return response.data;
    },
  };
}

// Safe Parking API hook
export function useSafeParkingAPI() {
  return {
    async getRecommended(params: { lat: number; lon: number; radius?: number; limit?: number }) {
      const response = await axios.get(
        `${API_BASE_URL}/api/safe-parking/recommended`,
        { params }
      );
      return response.data;
    },

    async getAll() {
      const response = await axios.get(
        `${API_BASE_URL}/api/safe-parking/all`
      );
      return response.data;
    },
  };
}


// Admin API hook
export function useAdminAPI() {
  const getHeaders = () => {
    const token = getAuthToken();

    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  return {
    async getDashboard(wardNumber?: number) {
      const headers = getHeaders();
      const params = wardNumber ? { ward_number: wardNumber } : {};

      const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
        headers,
        params,
      });
      return response.data;
    },

    async broadcast(wardNumber: number, title: string, message: string) {
      const headers = getHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/broadcast`,
        { ward_number: wardNumber, title, message },
        { headers }
      );
      return response.data;
    },
  };
}
