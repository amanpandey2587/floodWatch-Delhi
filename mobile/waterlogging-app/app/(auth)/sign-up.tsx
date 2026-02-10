import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function SignUpScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'ward_officer' | 'admin'>('citizen');
  const [wardNumber, setWardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !password) return;
    try {
      setLoading(true);
      setError(null);
      await register(name, email, password, role, wardNumber ? Number(wardNumber) : undefined);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 py-10">
        <Text className="text-3xl font-bold text-slate-900 dark:text-white">Sign Up</Text>
        <Text className="text-slate-500 dark:text-slate-400 mt-2">
          Create your FloodWatch account
        </Text>

        {error && (
          <View className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 rounded-lg">
            <Text className="text-red-600 dark:text-red-300 text-sm">{error}</Text>
          </View>
        )}

        <View className="mt-6 space-y-4">
          <View>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
              placeholder="Your name"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            />
          </View>
          <View>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
              placeholder="you@example.com"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            />
          </View>
          <View>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-4 rounded-xl"
              placeholder="••••••••"
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            />
          </View>
          <View>
            <Text className="text-xs text-slate-500 dark:text-slate-400 mb-2 uppercase">Role</Text>
            <View className="flex-row gap-2">
              {(['citizen', 'ward_officer', 'admin'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  className={`px-3 py-2 rounded-lg border ${
                    role === r ? 'bg-cyan-600 border-cyan-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Text className={`${role === r ? 'text-white' : 'text-slate-700 dark:text-slate-200'} text-xs font-semibold`}>
                    {r.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {role === 'ward_officer' && (
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
          )}
        </View>

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          className={`mt-6 p-4 rounded-xl items-center ${loading ? 'bg-slate-400' : 'bg-cyan-600'}`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} className="mt-6">
          <Text className="text-center text-slate-600 dark:text-slate-300">
            Already have an account? <Text className="text-cyan-600">Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
