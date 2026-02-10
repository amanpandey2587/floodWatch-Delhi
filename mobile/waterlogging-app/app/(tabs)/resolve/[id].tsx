import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function ResolveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authHeaders } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<any>(null);
  const [status, setStatus] = useState('pending');
  const [remarks, setRemarks] = useState('');
  const [etaHours, setEtaHours] = useState('');
  const [etaComment, setEtaComment] = useState('');
  const [resolution, setResolution] = useState('');
  const [commentText, setCommentText] = useState('');

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/complaints/${id}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to load complaint');
      setComplaint(data);
      setStatus(data.status || 'pending');
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchComplaint();
  }, [id]);

  const updateStatus = async () => {
    if (!remarks.trim()) return;
    const response = await fetch(`${API_BASE_URL}/api/complaints/${id}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status, remarks }),
    });
    await response.json();
    fetchComplaint();
    setRemarks('');
  };

  const setETA = async () => {
    if (!etaHours) return;
    const response = await fetch(`${API_BASE_URL}/api/complaints/${id}/eta`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ eta_hours: Number(etaHours), comment: etaComment }),
    });
    await response.json();
    fetchComplaint();
    setEtaComment('');
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const response = await fetch(`${API_BASE_URL}/api/complaints/${id}/timeline`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'comment', remarks: commentText }),
    });
    await response.json();
    fetchComplaint();
    setCommentText('');
  };

  const resolve = async () => {
    if (!resolution.trim()) return;
    const response = await fetch(`${API_BASE_URL}/api/complaints/${id}/resolve`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ resolution }),
    });
    await response.json();
    fetchComplaint();
  };

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

        <View className="mt-6">
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Update Status</Text>
          <View className="flex-row gap-2 mb-2">
            {['pending', 'acknowledged', 'in_progress', 'resolved'].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setStatus(s)}
                className={`px-3 py-2 rounded-lg border ${status === s ? 'bg-cyan-600 border-cyan-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
              >
                <Text className={`text-xs font-semibold ${status === s ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add remarks"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
          />
          <TouchableOpacity onPress={updateStatus} className="mt-3 bg-cyan-600 p-3 rounded-xl items-center">
            <Text className="text-white font-semibold">Update Status</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6">
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Set ETA (hours)</Text>
          <TextInput
            value={etaHours}
            onChangeText={setEtaHours}
            keyboardType="numeric"
            placeholder="12"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
          />
          <TextInput
            value={etaComment}
            onChangeText={setEtaComment}
            placeholder="Reason / note"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
          />
          <TouchableOpacity onPress={setETA} className="mt-3 bg-purple-600 p-3 rounded-xl items-center">
            <Text className="text-white font-semibold">Save ETA</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6">
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Add Comment</Text>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Internal update"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
          />
          <TouchableOpacity onPress={addComment} className="mt-3 bg-slate-900 p-3 rounded-xl items-center">
            <Text className="text-white font-semibold">Add Comment</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6">
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Resolve</Text>
          <TextInput
            value={resolution}
            onChangeText={setResolution}
            placeholder="Resolution details"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
          />
          <TouchableOpacity onPress={resolve} className="mt-3 bg-green-600 p-3 rounded-xl items-center">
            <Text className="text-white font-semibold">Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
