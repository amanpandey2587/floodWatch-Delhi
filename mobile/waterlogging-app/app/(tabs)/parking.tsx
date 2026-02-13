import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Callout, Marker, Polygon, Polyline } from 'react-native-maps';
import { AlertTriangle, MapPin, Navigation } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

import { API_BASE_URL } from '@/lib/config';
import { getErrorMessage } from '@/lib/utils';

interface ParkingLocation {
  name: string;
  lat: number | null;
  lon: number | null;
  risk: string | null;
  distance_m: number | null;
  final_score: number | null;
  route_data?: RouteData | null;
}

interface ResolvedLocation {
  name: string;
  lat: number;
  lon: number;
}

interface RouteData {
  route: {
    geometry: {
      coordinates: [number, number][];
    };
    properties: {
      distance_km: number;
      duration_min: number;
      profile: string;
    };
  };
  risk_analysis: {
    avg_risk: number;
    risk_level: string;
    color: string;
    warning_count: number;
  };
}

const DEFAULT_CENTER = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

const getRiskColor = (riskScore: number): string => {
  if (riskScore > 0.7) return '#e74c3c';
  if (riskScore > 0.5) return '#e67e22';
  if (riskScore > 0.3) return '#f1c40f';
  return '#2ecc71';
};

export default function ParkingScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [locationQuery, setLocationQuery] = useState('');
  const [origin, setOrigin] = useState<ResolvedLocation | null>(null);
  const [radius, setRadius] = useState('4');
  const [limit, setLimit] = useState('3');
  const [profile, setProfile] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [lastSearch, setLastSearch] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gridData, setGridData] = useState<any | null>(null);

  const parseNumber = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const getSearchParams = (resolvedOrigin: ResolvedLocation) =>
    new URLSearchParams({
      lat: String(resolvedOrigin.lat),
      lon: String(resolvedOrigin.lon),
      radius: String((parseNumber(radius) ?? 2) * 1000),
      limit: String(parseNumber(limit) ?? 3),
    });

  const resolveLocation = async (query: string): Promise<ResolvedLocation | null> => {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const res = await fetch(`${API_BASE_URL}/api/geocode?query=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0] as ResolvedLocation;
  };

  const getRoute = async (start: ResolvedLocation, end: ParkingLocation) => {
    if (end.lat === null || end.lon === null) return null;

    const params = new URLSearchParams({
      start_lat: String(start.lat),
      start_lon: String(start.lon),
      end_lat: String(end.lat),
      end_lon: String(end.lon),
      profile,
    });

    const res = await fetch(`${API_BASE_URL}/api/route?${params.toString()}`);
    if (!res.ok) return null;

    return (await res.json()) as RouteData;
  };

  const getBasicNearby = async (resolvedOrigin: ResolvedLocation) => {
    const params = getSearchParams(resolvedOrigin);
    const res = await fetch(`${API_BASE_URL}/api/safe-parking?${params.toString()}`);
    if (!res.ok) return [] as ParkingLocation[];
    const data = await res.json();
    return (data.locations || []) as ParkingLocation[];
  };

  const fetchNearby = async (presetOrigin?: ResolvedLocation) => {
    let resolvedOrigin = presetOrigin ?? origin;

    if (!resolvedOrigin) {
      resolvedOrigin = await resolveLocation(locationQuery);
    }

    if (!resolvedOrigin) {
      setError('Please enter a valid location name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setOrigin(resolvedOrigin);

      const params = getSearchParams(resolvedOrigin);

      const res = await fetch(`${API_BASE_URL}/api/safe-parking/recommended?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load safe parking locations');
      }

      const data = await res.json();
      let recommended = (data.locations || []) as ParkingLocation[];

      if (recommended.length === 0) {
        recommended = await getBasicNearby(resolvedOrigin);
      }

      const withRouteData = await Promise.all(
        recommended.map(async (loc) => {
          const routeData = await getRoute(resolvedOrigin!, loc);
          return { ...loc, route_data: routeData };
        })
      );

      setLocations(withRouteData);
      setSelectedIndex(0);
      setLastSearch(`From ${resolvedOrigin.name} within ${radius} km`);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        setError('Location permission denied. Enter location manually.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const currentOrigin: ResolvedLocation = {
        name: 'Current Location',
        lat: Number(pos.coords.latitude.toFixed(6)),
        lon: Number(pos.coords.longitude.toFixed(6)),
      };

      setLocationQuery(currentOrigin.name);
      await fetchNearby(currentOrigin);
    } catch (err: any) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const selectedLocation = locations[selectedIndex];
  const selectedRoute = selectedLocation?.route_data;

  const gridPolygons = useMemo(() => {
    if (!gridData?.features || !Array.isArray(gridData.features)) return [];

    const polygons: { coordinates: { latitude: number; longitude: number }[]; fillColor: string; key: string }[] = [];

    gridData.features.forEach((feature: any, idx: number) => {
      const riskScore = feature?.properties?.risk_score || 0;
      const fillColor = getRiskColor(riskScore);

      if (feature?.geometry?.type === 'Polygon') {
        const ring = feature.geometry.coordinates?.[0] || [];
        const coords = ring.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
        if (coords.length > 2) {
          polygons.push({ coordinates: coords, fillColor, key: `poly-${idx}` });
        }
      }

      if (feature?.geometry?.type === 'MultiPolygon') {
        const multi = feature.geometry.coordinates || [];
        multi.forEach((poly: any, pIdx: number) => {
          const ring = poly?.[0] || [];
          const coords = ring.map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
          if (coords.length > 2) {
            polygons.push({ coordinates: coords, fillColor, key: `multi-${idx}-${pIdx}` });
          }
        });
      }
    });

    return polygons;
  }, [gridData]);

  useEffect(() => {
    const fetchGrid = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/grid?risk_min=0`);
        if (!res.ok) return;
        const grid = await res.json();
        setGridData(grid);
      } catch {
        setGridData(null);
      }
    };

    fetchGrid();
  }, []);

  useEffect(() => {
    useMyLocation();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <ScrollView contentContainerStyle={styles.content}>
        <View className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">Safe Parking Finder</Text>
            <MapPin size={20} color={isDark ? '#22d3ee' : '#0891b2'} />
          </View>
          <Text className="text-xs text-gray-500 dark:text-slate-400">
            Find elevated parking locations with minimal flood risk
          </Text>

          <TouchableOpacity
            className="mt-4 rounded-xl bg-cyan-600 py-3"
            onPress={useMyLocation}
            disabled={loading}
          >
            <View className="flex-row items-center justify-center gap-2">
              <Navigation size={16} color="#ffffff" />
              <Text className="font-bold text-white">Use My Location</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Your Location</Text>
          <TextInput
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="e.g., Connaught Place"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            value={locationQuery}
            onChangeText={setLocationQuery}
          />

          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Radius (km)</Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="4"
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Max Results</Text>
              <TextInput
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="3"
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={limit}
                onChangeText={setLimit}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Travel Mode</Text>
          <View className="flex-row gap-2">
            {['driving', 'walking', 'cycling'].map((mode) => (
              <TouchableOpacity
                key={mode}
                className={`flex-1 rounded-lg border px-3 py-2 ${profile === mode
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                  : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-950'
                  }`}
                onPress={() => setProfile(mode)}
              >
                <Text className={`text-center text-xs font-semibold ${profile === mode ? 'text-cyan-700 dark:text-cyan-300' : 'text-gray-700 dark:text-slate-300'}`}>
                  {mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {origin && (
            <View className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-800 dark:bg-cyan-950/30">
              <Text className="text-xs text-cyan-800 dark:text-cyan-200">
                Starting from: {origin.name} ({origin.lat.toFixed(5)}, {origin.lon.toFixed(5)})
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="mt-4 rounded-xl bg-slate-900 py-3 dark:bg-white"
            onPress={() => fetchNearby()}
            disabled={loading}
          >
            <View className="flex-row items-center justify-center gap-2">
              {loading ? (
                <ActivityIndicator color={isDark ? '#0f172a' : '#ffffff'} />
              ) : (
                <MapPin size={16} color={isDark ? '#0f172a' : '#ffffff'} />
              )}
              <Text className="font-bold text-white dark:text-slate-900">
                {loading ? 'Searching for safe parking...' : 'Find Safe Parking'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {error && (
          <View className="mt-4 flex-row gap-3 rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-950/30">
            <AlertTriangle size={16} color="#ef4444" />
            <Text className="flex-1 text-sm text-red-600 dark:text-red-300">{error}</Text>
          </View>
        )}

        <View className="mt-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800">
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? 'google' : undefined}
            initialRegion={DEFAULT_CENTER}
            region={origin
              ? {
                latitude: origin.lat,
                longitude: origin.lon,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }
              : undefined}
            showsUserLocation
            showsMyLocationButton
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            {gridPolygons.map((poly) => (
              <Polygon
                key={poly.key}
                coordinates={poly.coordinates}
                fillColor={`${poly.fillColor}66`}
                strokeColor="#ffffff"
                strokeWidth={0.4}
              />
            ))}

            {origin && (
              <Marker
                coordinate={{ latitude: origin.lat, longitude: origin.lon }}
                pinColor="#2563eb"
              >
                <Callout>
                  <View>
                    <Text style={styles.calloutTitle}>Start Location</Text>
                    <Text style={styles.calloutText}>{origin.name}</Text>
                  </View>
                </Callout>
              </Marker>
            )}

            {locations.map((loc, idx) =>
              loc.lat !== null && loc.lon !== null ? (
                <Marker
                  key={`parking-${idx}`}
                  coordinate={{ latitude: loc.lat, longitude: loc.lon }}
                  pinColor="#16a34a"
                  onPress={() => {
                    setSelectedIndex(idx);
                  }}
                >
                  <Callout>
                    <View>
                      <Text style={styles.calloutTitle}>{loc.name || 'Safe Parking'}</Text>
                      <Text style={styles.calloutText}>Risk: {loc.risk ?? 'Unknown'}</Text>
                      {loc.distance_m !== null && (
                        <Text style={styles.calloutText}>{(loc.distance_m / 1000).toFixed(2)} km away</Text>
                      )}
                    </View>
                  </Callout>
                </Marker>
              ) : null
            )}

            {selectedRoute && (
              <Polyline
                coordinates={selectedRoute.route.geometry.coordinates.map(([lon, lat]) => ({
                  latitude: lat,
                  longitude: lon,
                }))}
                strokeColor={selectedRoute.risk_analysis.color}
                strokeWidth={5}
              />
            )}
          </MapView>
        </View>

        <View className="mt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {locations.length > 0 ? `Found ${locations.length} Safe Location${locations.length > 1 ? 's' : ''}` : 'Search Results'}
            </Text>
            {lastSearch && (
              <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                {lastSearch}
              </Text>
            )}
          </View>

          {locations.length === 0 && !loading && !error && (
            <View className="items-center rounded-xl border border-gray-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-900">
              <Text className="text-sm text-gray-500 dark:text-slate-400">
                No locations found. Try expanding your search radius.
              </Text>
            </View>
          )}

          {locations.map((loc, index) => (
            <TouchableOpacity
              key={`card-${index}`}
              className={`mb-3 rounded-xl border p-4 ${index === selectedIndex
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                : 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              onPress={() => {
                setSelectedIndex(index);
              }}
            >
              <View className="flex-row items-start justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-base font-bold text-gray-900 dark:text-white">
                    {loc.name || `Parking at (${loc.lat?.toFixed(4)}, ${loc.lon?.toFixed(4)})`}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Risk Level: {loc.risk ?? 'Unknown'}
                  </Text>
                </View>
                <Text className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  #{index + 1}
                </Text>
              </View>

              {loc.distance_m !== null && (
                <Text className="mt-3 text-xs text-gray-500 dark:text-slate-400">
                  Distance: {(loc.distance_m / 1000).toFixed(2)} km
                </Text>
              )}

              {loc.route_data && (
                <View className="mt-3 border-t border-gray-200 pt-3 dark:border-slate-700">
                  <Text className="text-xs text-gray-500 dark:text-slate-400">
                    Route Distance: {loc.route_data.route.properties.distance_km.toFixed(2)} km
                  </Text>
                  <Text className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Travel Time: {loc.route_data.route.properties.duration_min.toFixed(0)} min
                  </Text>
                  <Text
                    className="mt-2 self-start rounded-full px-2 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: loc.route_data.risk_analysis.color }}
                  >
                    {loc.route_data.risk_analysis.risk_level}
                  </Text>
                </View>
              )}

              <Text className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                {loc.lat?.toFixed(5) ?? '-'}, {loc.lon?.toFixed(5) ?? '-'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  map: {
    width: '100%',
    height: 340,
  },
  calloutTitle: {
    fontWeight: '700',
    color: '#0f172a',
  },
  calloutText: {
    marginTop: 2,
    color: '#334155',
  },
});

