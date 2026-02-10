import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MapPin, Navigation, AlertTriangle, Car } from 'lucide-react-native';
import { API_BASE_URL } from '@/lib/config';
import { getErrorMessage } from '@/lib/utils';
import { useColorScheme } from 'nativewind';

interface ParkingLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  type: string;
  capacity: number;
  elevation_m: number;
  ward_number: number;
  distance_m?: number;
  distance_km?: number;
}

export default function ParkingScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [radius, setRadius] = useState('2000');
  const [limit, setLimit] = useState('3');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);

  const parseNumber = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const fetchNearby = async (latValue?: number, lonValue?: number) => {
    const latNum = latValue ?? parseNumber(lat);
    const lonNum = lonValue ?? parseNumber(lon);

    if (latNum === null || lonNum === null) {
      setError('Please enter valid latitude and longitude.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: String(latNum),
        lon: String(lonNum),
        radius: String(parseNumber(radius) ?? 2000),
        limit: String(parseNumber(limit) ?? 3),
      });

      const response = await fetch(`${API_BASE_URL}/api/safe-parking?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch parking locations');
      }
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/safe-parking/all`);
      if (!response.ok) {
        throw new Error('Failed to fetch parking locations');
      }
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const useCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Enter coordinates manually.');
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latVal = Number(pos.coords.latitude.toFixed(6));
      const lonVal = Number(pos.coords.longitude.toFixed(6));
      setLat(String(latVal));
      setLon(String(lonVal));
      await fetchNearby(latVal, lonVal);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  useEffect(() => {
    useCurrentLocation();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (lat && lon) {
      fetchNearby();
    } else {
      fetchAll();
    }
  }, [lat, lon, radius, limit]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <View className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-900 dark:text-white text-xl font-bold">Safe Parking</Text>
          <Car size={20} color={isDark ? '#38bdf8' : '#0ea5e9'} />
        </View>
        <Text className="text-gray-500 dark:text-slate-400 text-xs mt-1">
          Find elevated or multi-level parking near your location
        </Text>
      </View>

      <View className="px-6 py-4 gap-3">
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-cyan-600 py-3 rounded-xl items-center"
            onPress={useCurrentLocation}
            disabled={loading}
          >
            <Text className="text-white font-bold">Use My Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
            onPress={fetchAll}
            disabled={loading}
          >
            <Text className="text-white font-bold">Show All</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-3">
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
            placeholder="Latitude"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            value={lat}
            onChangeText={setLat}
            keyboardType="numeric"
          />
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
            placeholder="Longitude"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            value={lon}
            onChangeText={setLon}
            keyboardType="numeric"
          />
        </View>

        <View className="flex-row gap-3">
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
            placeholder="Radius (m)"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            value={radius}
            onChangeText={setRadius}
            keyboardType="numeric"
          />
          <TextInput
            className="flex-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
            placeholder="Limit"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            value={limit}
            onChangeText={setLimit}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 py-3 rounded-xl items-center"
          onPress={() => fetchNearby()}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={isDark ? '#38bdf8' : '#0ea5e9'} /> : <Text className="font-bold text-gray-800 dark:text-white">Find Parking</Text>}
        </TouchableOpacity>
      </View>

      {error && (
        <View className="mx-6 mb-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/40 flex-row gap-3">
          <AlertTriangle size={18} color="#ef4444" />
          <Text className="text-red-500 dark:text-red-300 text-sm flex-1">{error}</Text>
        </View>
      )}

      {loading && locations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#38bdf8' : '#0ea5e9'} />
          <Text className="text-gray-500 dark:text-slate-500 mt-4">Loading safe parking...</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-gray-500 dark:text-slate-500">No locations found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-4 shadow-sm">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-4">
                  <Text className="text-gray-900 dark:text-white font-bold text-lg">{item.name}</Text>
                  <Text className="text-gray-500 dark:text-slate-400 text-xs mt-1">{item.address}</Text>
                </View>
                <Text className="text-xs px-2 py-1 rounded-full border border-cyan-500/40 text-cyan-600 dark:text-cyan-300">
                  {item.type.replace('_', ' ')}
                </Text>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-3">
                <View className="flex-row items-center gap-1">
                  <MapPin size={12} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                  <Text className="text-gray-500 dark:text-slate-400 text-xs">Ward {item.ward_number}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Navigation size={12} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                  <Text className="text-gray-500 dark:text-slate-400 text-xs">
                    {item.distance_km !== undefined ? `${item.distance_km} km` : 'Distance n/a'}
                  </Text>
                </View>
                <Text className="text-gray-500 dark:text-slate-400 text-xs">Capacity {item.capacity}</Text>
                <Text className="text-gray-500 dark:text-slate-400 text-xs">Elevation {item.elevation_m} m</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
