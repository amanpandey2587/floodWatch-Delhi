'use client';

import axios from 'axios';
import { useAuth, useUser } from '@clerk/nextjs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Complaint API hook for client components
export function useComplaintAPI() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  
  const getHeaders = async () => {
    const token = await getToken();
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(userId && { 'X-User-ID': userId }),
      ...(sessionClaims?.metadata?.role && { 'X-User-Role': sessionClaims.metadata.role as string }),
      ...(sessionClaims?.metadata?.ward_number && { 'X-Ward-Number': (sessionClaims.metadata.ward_number as number).toString() }),
    };
  };
  
  return {
    async fileComplaint(complaintData: any) {
      const headers = await getHeaders();
      
      const response = await axios.post(
        `${API_BASE_URL}/api/complaints`,
        complaintData,
        { headers }
      );
      return response.data;
    },

    async getComplaints(filters?: { ward_number?: number; status?: string }) {
      const headers = await getHeaders();
      
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
      const headers = await getHeaders();
      
      const response = await axios.put(
        `${API_BASE_URL}/api/complaints/${complaintId}/status`,
        { status, remarks },
        { headers }
      );
      return response.data;
    },

    async assignComplaint(complaintId: string, officerId: string) {
      const headers = await getHeaders();
      
      const response = await axios.put(
        `${API_BASE_URL}/api/complaints/${complaintId}/assign`,
        {},
        {
          headers: {
            ...headers,
            'X-Officer-ID': officerId,
          },
        }
      );
      return response.data;
    },

    async resolveComplaint(complaintId: string, resolution: string) {
      const headers = await getHeaders();
      
      const response = await axios.put(
        `${API_BASE_URL}/api/complaints/${complaintId}/resolve`,
        { resolution },
        { headers }
      );
      return response.data;
    },

    async rateComplaint(complaintId: string, rating: number, feedback?: string) {
      const headers = await getHeaders();
      
      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/${complaintId}/rate`,
        { rating, feedback },
        { headers }
      );
      return response.data;
    },

    async addTimelineEntry(complaintId: string, entry: any) {
      const headers = await getHeaders();
      
      const response = await axios.post(
        `${API_BASE_URL}/api/complaints/${complaintId}/timeline`,
        entry,
        { headers }
      );
      return response.data;
    },
  };
}

// Admin API hook
export function useAdminAPI() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  
  const getHeaders = async () => {
    const token = await getToken();
    const role = user?.publicMetadata?.role as string;
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(userId && { 'X-User-ID': userId }),
      ...(role && { 'X-User-Role': role }),
    };
  };

  return {
    async getDashboard(wardNumber?: number) {
      const headers = await getHeaders();
      const params = wardNumber ? { ward_number: wardNumber } : {};
      const response = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
        headers,
        params,
      });
      return response.data;
    },

    async broadcast(wardNumber: number, title: string, message: string) {
      const headers = await getHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/broadcast`,
        { ward_number: wardNumber, title, message },
        { headers }
      );
      return response.data;
    },
  };
}
