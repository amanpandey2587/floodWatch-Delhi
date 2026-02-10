import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Map, AlertTriangle, Navigation, BarChart3, Shield, MessageSquare, Search } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function HomeScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="px-6 py-6 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-gray-500 dark:text-slate-400 text-sm font-medium">Welcome back,</Text>
              <Text className="text-gray-900 dark:text-white text-2xl font-bold">Citizen</Text>
            </View>
            <TouchableOpacity className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-500/20 items-center justify-center border border-cyan-200 dark:border-cyan-500/30">
              <Shield size={20} color="#06b6d4" />
            </TouchableOpacity>
          </View>

          <View className="mt-6 flex-row items-center bg-cyan-100/50 dark:bg-cyan-950/40 p-3 rounded-xl border border-cyan-200 dark:border-cyan-500/20">
            <View className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse mr-3" />
            <Text className="text-cyan-700 dark:text-cyan-400 font-bold text-xs uppercase tracking-widest">Live Monitoring Active</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View className="px-6 py-8">
          <Text className="text-gray-900 dark:text-white text-3xl font-black mb-2 leading-tight">
            Stay Safe in <Text className="text-cyan-600 dark:text-cyan-400">Delhi</Text>
          </Text>
          <Text className="text-gray-600 dark:text-slate-400 text-base mb-8">
            Real-time waterlogging data and safe route planning at your fingertips.
          </Text>

          {/* Quick Actions */}
          <View className="flex-row gap-4 mb-8">
            <TouchableOpacity
              className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-xl items-center shadow-sm"
              onPress={() => router.push('/(tabs)/map' as any)}
            >
              <Map size={24} color={isDark ? "#94a3b8" : "#475569"} className="mb-2"  />
              <Text className="text-gray-700 dark:text-slate-200 font-bold text-base">Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-xl items-center shadow-sm"
              onPress={() => router.push('/(tabs)/report')}
            >
              <MessageSquare size={24} color={isDark ? "#94a3b8" : "#475569"} className="mb-2" />
              <Text className="text-gray-700 dark:text-slate-200 font-bold text-base">Report Issue</Text>
            </TouchableOpacity>
          </View>

          {/* Feature Grid */}
          <Text className="text-gray-900 dark:text-white text-xl font-bold mb-4">Features</Text>
          <View className="gap-4">

            {/* Safe Routes */}
            <TouchableOpacity
              className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-gray-200 dark:border-white/5 flex-row items-center gap-4 shadow-sm"
              onPress={() => router.push('/(tabs)/map' as any)}
            >
              <View className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 items-center justify-center">
                <Navigation size={24} color="#a855f7" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold text-lg">Safe Routes</Text>
                <Text className="text-gray-500 dark:text-slate-400 text-xs">AI-calculated paths avoiding floods</Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 items-center justify-center">
                <Text className="text-gray-400 dark:text-slate-400">→</Text>
              </View>
            </TouchableOpacity>

            {/* Risk Analysis */}
            <TouchableOpacity
              className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-gray-200 dark:border-white/5 flex-row items-center gap-4 shadow-sm"
              onPress={() => router.push('/(tabs)/map' as any)}
            >
              <View className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 items-center justify-center">
                <BarChart3 size={24} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold text-lg">Risk Analysis</Text>
                <Text className="text-gray-500 dark:text-slate-400 text-xs">Ward-level simplified analytics</Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 items-center justify-center">
                <Text className="text-gray-400 dark:text-slate-400">→</Text>
              </View>
            </TouchableOpacity>

            {/* Track Status */}
            <TouchableOpacity
              className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-gray-200 dark:border-white/5 flex-row items-center gap-4 shadow-sm"
              onPress={() => router.push('/(tabs)/status')}
            >
              <View className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-500/20 items-center justify-center">
                <Search size={24} color="#22c55e" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold text-lg">Track Complaint</Text>
                <Text className="text-gray-500 dark:text-slate-400 text-xs">Check status of your reports</Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 items-center justify-center">
                <Text className="text-gray-400 dark:text-slate-400">→</Text>
              </View>
            </TouchableOpacity>

          </View>
        </View>

        {/* SOS Button (Optional for later, but good for UI) */}
        <View className="px-6 mt-4">
          <TouchableOpacity className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 p-4 rounded-xl flex-row items-center justify-center gap-3">
            <AlertTriangle size={20} color="#ef4444" />
            <Text className="text-red-500 dark:text-red-400 font-bold">Emergency SOS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}