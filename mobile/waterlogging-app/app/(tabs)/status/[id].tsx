import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/lib/AuthContext';
import { Clock, MapPin, ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authHeaders } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<any>(null);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/complaints/${id}`, {
          headers: authHeaders(),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.detail || 'Failed to load complaint');
        }
        setComplaint(data);
        setError(null);
      } catch (e: any) {
        setError(e.message || 'Failed to load complaint');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchComplaint();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
        <ActivityIndicator color="#06b6d4" />
      </SafeAreaView>
    );
  }

  if (error || !complaint) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 p-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <ArrowLeft size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text className="text-red-500">{error || 'Complaint not found'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView className="p-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <ArrowLeft size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white">{complaint.title}</Text>
        <Text className="text-slate-500 dark:text-slate-400 mt-1">ID: {complaint.complaint_id}</Text>

        <View className="mt-4 flex-row items-center gap-3">
          <MapPin size={14} color={isDark ? '#94a3b8' : '#64748b'} />
          <Text className="text-slate-600 dark:text-slate-300">Ward {complaint.ward_number}</Text>
          <Clock size={14} color={isDark ? '#94a3b8' : '#64748b'} />
          <Text className="text-slate-600 dark:text-slate-300">{new Date(complaint.created_at).toLocaleString()}</Text>
        </View>

        <Text className="mt-4 text-slate-700 dark:text-slate-200">{complaint.description}</Text>

        {complaint.sla_info && (
          <View className="mt-6">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">SLA Tracking</Text>
            <View className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, complaint.sla_info.sla_percentage)}%`,
                  backgroundColor: complaint.sla_info.sla_status === 'sla_breached' ? '#ef4444' : '#22c55e',
                }}
              />
            </View>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Remaining {complaint.sla_info.remaining_hours?.toFixed(0)}h
            </Text>
          </View>
        )}

        {complaint.timeline && complaint.timeline.length > 0 && (
          <View className="mt-6">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Timeline</Text>
            {complaint.timeline.slice().reverse().map((t: any, idx: number) => (
              <View key={idx} className="mb-3">
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(t.timestamp).toLocaleString()} — {t.status}
                </Text>
                <Text className="text-slate-700 dark:text-slate-200">{t.remarks}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
