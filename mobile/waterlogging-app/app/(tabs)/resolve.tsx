import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

interface Complaint {
  complaint_id: string;
  title: string;
  ward_number: number;
  status: string;
  eta_hours?: number;
}

export default function ResolveScreen() {
  const { authHeaders, user } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchComplaints = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      const response = await fetch(`${API_BASE_URL}/api/complaints?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to load complaints');
      setComplaints(data.complaints || data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const renderItem = ({ item }: { item: Complaint }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/resolve/${item.complaint_id}`)}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-4"
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-slate-900 dark:text-white font-semibold">{item.title}</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-xs">{item.complaint_id}</Text>
        </View>
        <Text className="text-slate-600 dark:text-slate-300 text-sm capitalize">
          {item.status.replace('_', ' ')}
        </Text>
      </View>
      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-slate-500 dark:text-slate-400 text-xs">Ward {item.ward_number}</Text>
        <Text className="text-slate-500 dark:text-slate-400 text-xs">{item.eta_hours ? `${item.eta_hours}h` : '—'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
        <Text className="text-gray-900 dark:text-white text-xl font-bold">Resolve Complaints</Text>
        <Text className="text-gray-500 dark:text-slate-400 text-xs mt-1">Admin complaint queue</Text>
      </View>

      <View className="px-6 py-3 flex-row gap-2">
        {['all', 'pending', 'acknowledged', 'in_progress', 'resolved'].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setFilterStatus(s)}
            className={`px-3 py-2 rounded-lg border ${
              filterStatus === s ? 'bg-cyan-600 border-cyan-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Text className={`text-xs font-semibold ${filterStatus === s ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#06b6d4" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-red-500">{error}</Text>
          <TouchableOpacity onPress={fetchComplaints} className="mt-4 bg-slate-900 px-4 py-2 rounded-lg">
            <Text className="text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={complaints}
          renderItem={renderItem}
          keyExtractor={(item) => item.complaint_id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
        />
      )}
    </SafeAreaView>
  );
}
