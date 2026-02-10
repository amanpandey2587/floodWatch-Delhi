import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@/lib/config';
import { useColorScheme } from 'nativewind';

interface WardRisk {
  mention_count: number;
  avg_urgency: number;
  avg_sentiment: number;
  risk_spike: number;
}

interface SocialPost {
  platform: string;
  text: string;
  ward: string;
  urgency: number;
  timestamp: string;
}

interface MonitoringData {
  timestamp: string;
  total_posts: number;
  ward_analysis: Record<string, WardRisk>;
  recent_posts: SocialPost[];
}

export default function SocialScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/social/monitor/status`);
      const data = await response.json();
      if (data.status === 'success') {
        setMonitoringData(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch monitoring data');
      }
    } catch {
      setError('Failed to fetch monitoring data');
    }
  };

  const startMonitoring = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/social/monitor/start?hours_back=24`, { method: 'POST' });
      const data = await response.json();
      if (data.status === 'started') {
        setTimeout(() => {
          fetchMonitoringData();
          setLoading(false);
        }, 1500);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
      setError('Failed to start monitoring');
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, 60000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getRiskColor = (riskSpike: number): string => {
    if (riskSpike > 0.7) return '#ef4444';
    if (riskSpike > 0.5) return '#f97316';
    if (riskSpike > 0.3) return '#eab308';
    return '#22c55e';
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 py-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
        <Text className="text-gray-900 dark:text-white text-xl font-bold">Social Monitor</Text>
        <Text className="text-gray-500 dark:text-slate-400 text-xs mt-1">Ward-level social signals</Text>
      </View>

      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={startMonitoring}
          disabled={loading}
          className={`px-4 py-2 rounded-lg ${loading ? 'bg-slate-400' : 'bg-cyan-600'}`}
        >
          <Text className="text-white font-semibold">{loading ? 'Loading' : 'Scan'}</Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-500 dark:text-slate-400">Auto-refresh</Text>
          <Switch value={autoRefresh} onValueChange={setAutoRefresh} />
        </View>
      </View>

      {error && (
        <View className="mx-6 mb-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 rounded-lg">
          <Text className="text-red-600 dark:text-red-300 text-sm">{error}</Text>
        </View>
      )}

      <ScrollView className="px-6 pb-6">
        {loading && (
          <View className="py-8 items-center">
            <ActivityIndicator color="#06b6d4" />
            <Text className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Scanning...</Text>
          </View>
        )}

        {!loading && monitoringData && (
          <>
            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6">
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Ward Alerts</Text>
              {Object.entries(monitoringData.ward_analysis)
                .sort(([, a], [, b]) => b.risk_spike - a.risk_spike)
                .slice(0, 5)
                .map(([ward, stats]) => (
                  <View key={ward} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-2">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-slate-900 dark:text-white font-semibold">{ward}</Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                          {stats.mention_count} mentions · Urgency {(stats.avg_urgency * 100).toFixed(0)}%
                        </Text>
                      </View>
                      <Text className="text-lg font-bold" style={{ color: getRiskColor(stats.risk_spike) }}>
                        {(stats.risk_spike * 100).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>

            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Recent Posts</Text>
              {monitoringData.recent_posts.slice(0, 5).map((post, idx) => (
                <View key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mb-2">
                  <Text className="text-xs text-slate-800 dark:text-slate-100 mb-1">{post.text}</Text>
                  <View className="flex-row items-center gap-2">
                    {post.ward && (
                      <Text className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
                        {post.ward}
                      </Text>
                    )}
                    <Text className="text-xs text-white font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: getRiskColor(post.urgency) }}>
                      Urgency {(post.urgency * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
