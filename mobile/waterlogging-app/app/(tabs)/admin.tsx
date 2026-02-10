import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/lib/AuthContext';
import { useColorScheme } from 'nativewind';

export default function AdminScreen() {
  const { authHeaders, user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [wardNumber, setWardNumber] = useState<string>(user?.ward_number?.toString() || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sendBroadcast = async () => {
    if (!wardNumber || !title || !message) return;
    try {
      setLoading(true);
      setStatus(null);
      const response = await fetch(`${API_BASE_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ward_number: Number(wardNumber), title, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to broadcast');
      setStatus('Broadcast sent');
      setTitle('');
      setMessage('');
    } catch (e: any) {
      setStatus(e.message || 'Failed to broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 py-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
        <Text className="text-gray-900 dark:text-white text-xl font-bold">Admin Broadcast</Text>
        <Text className="text-gray-500 dark:text-slate-400 text-xs mt-1">
          Send ward notifications and alerts
        </Text>
      </View>

      <View className="p-6 space-y-4">
        {status && (
          <View className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
            <Text className="text-slate-700 dark:text-slate-300 text-sm">{status}</Text>
          </View>
        )}

        <View>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Ward Number</Text>
          <TextInput
            value={wardNumber}
            onChangeText={setWardNumber}
            keyboardType="numeric"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
            placeholder="44"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          />
        </View>

        <View>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
            placeholder="Heavy rain alert"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          />
        </View>

        <View>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl min-h-[120px]"
            placeholder="Please avoid low-lying roads in ward 44."
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          />
        </View>

        <TouchableOpacity
          onPress={sendBroadcast}
          disabled={loading}
          className={`p-4 rounded-xl items-center ${loading ? 'bg-slate-400' : 'bg-cyan-600'}`}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Send Broadcast</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
