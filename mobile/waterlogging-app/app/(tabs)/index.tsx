import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

// Replace with your actual IP address
const API_BASE_URL = 'http://10.202.171.146:8000';

const SCREENS = {
  MAP: 'map',
  ROUTE: 'route',
};

// Color based on risk score
const getRiskColor = (riskScore: number): string => {
  if (riskScore > 0.7) return '#e74c3c';
  if (riskScore > 0.5) return '#e67e22';
  if (riskScore > 0.3) return '#f1c40f';
  return '#2ecc71';
};

// Convert hex to rgba for polygon fills
const hexToRgba = (hex: string, alpha: number = 0.7): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Map Screen Component
function WaterloggingMapScreen() {
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<number>(0.5); // Start with high risk only
  const [showStats, setShowStats] = useState(true);
  const [maxPolygons, setMaxPolygons] = useState<number>(500); // Limit rendering

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [gridRes, wardsRes, drainsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/grid?risk_min=${filterRisk}`),
          fetch(`${API_BASE_URL}/api/wards`),
          fetch(`${API_BASE_URL}/api/drains`),
          fetch(`${API_BASE_URL}/api/stats`),
        ]);

        const [grid, wards, drains, stats] = await Promise.all([
          gridRes.json(),
          wardsRes.json(),
          drainsRes.json(),
          statsRes.json(),
        ]);

        setMapData({ grid, wards, drains, stats });
        setLoading(false);
      } catch (err: any) {
        setError('Failed to load data. Check if backend is running at ' + API_BASE_URL);
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, [filterRisk]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>⚠️ Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>Make sure your backend is running on {API_BASE_URL}</Text>
      </View>
    );
  }

  // Convert GeoJSON to MapView polygons with LIMIT
const renderGridPolygons = () => {
  if (!mapData?.grid?.features) {
    console.log('No grid features found');
    return null;
  }

  // Sort by risk score (highest first) and limit
  const sortedFeatures = [...mapData.grid.features]
    .sort((a, b) => (b.properties.risk_score || 0) - (a.properties.risk_score || 0))
    .slice(0, maxPolygons);

  console.log(`Rendering ${sortedFeatures.length} / ${mapData.grid.features.length} grid polygons (top risk areas)`);

  return sortedFeatures.map((feature: any, index: number) => {
    try {
      // Handle different GeoJSON geometry types
      let coords = feature.geometry.coordinates;

      // If it's a Polygon, coordinates is an array of rings
      // If it's a MultiPolygon, coordinates is an array of polygons
      if (feature.geometry.type === 'MultiPolygon') {
        coords = coords[0]; // Take first polygon
      }

      // Get the outer ring
      const outerRing = coords[0];
      const coordinates = outerRing.map((coord: number[]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));

      const riskScore = feature.properties.risk_score || 0;
      const color = getRiskColor(riskScore);

      // Debug first polygon
      if (index === 0) {
        console.log('Highest risk polygon:', riskScore);
      }

      // FIX: Create unique key using feature properties or coordinates
      // Option 1: If features have an id property
      const uniqueKey = feature.id 
        ? `grid-${feature.id}`
        // Option 2: Use properties that make each feature unique
        : feature.properties?.id 
        ? `grid-${feature.properties.id}`
        // Option 3: Create hash from coordinates (fallback)
        : `grid-${outerRing[0][0]}-${outerRing[0][1]}-${index}`;

      return (
        <Polygon
          key={uniqueKey}
          coordinates={coordinates}
          fillColor={hexToRgba(color, 0.4)}
          strokeColor={color}
          strokeWidth={1}
        />
      );
    } catch (error) {
      console.error('Error rendering polygon', index, error);
      return null;
    }
  });
};

  // Render ward boundaries
// Render ward boundaries
const renderWardBoundaries = () => {
  if (!mapData?.wards?.features) return null;

  return mapData.wards.features.map((feature: any, index: number) => {
    const coordinates = feature.geometry.coordinates[0].map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    // Create unique key
    const uniqueKey = feature.id 
      ? `ward-${feature.id}`
      : feature.properties?.ward_id || feature.properties?.name
      ? `ward-${feature.properties.ward_id || feature.properties.name}`
      : `ward-${index}`;

    return (
      <Polygon
        key={uniqueKey}
        coordinates={coordinates}
        fillColor="rgba(0,0,0,0)"
        strokeColor="#4a5568"
        strokeWidth={0}
      />
    );
  });
};

// Render drainage network
const renderDrainageNetwork = () => {
  if (!mapData?.drains?.features) return null;

  return mapData.drains.features.map((feature: any, index: number) => {
    const coordinates = feature.geometry.coordinates.map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    // Create unique key
    const uniqueKey = feature.id 
      ? `drain-${feature.id}`
      : feature.properties?.drain_id || feature.properties?.name
      ? `drain-${feature.properties.drain_id || feature.properties.name}`
      : `drain-${coordinates[0].latitude}-${coordinates[0].longitude}`;

    return (
      <Polyline
        key={uniqueKey}
        coordinates={coordinates}
        strokeColor="#3b82f6"
        strokeWidth={2}
      />
    );
  });
};
  return (
    <View style={styles.mapScreenContainer}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: 28.65,
          longitude: 77.28,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onMapReady={() => console.log('Map is ready')}
        onError={(error) => console.error('Map error:', error)}
      >
        {renderGridPolygons()}
        {renderWardBoundaries()}
        {renderDrainageNetwork()}
      </MapView>
      
      {/* Debug info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Showing: {mapData?.grid?.features ? Math.min(maxPolygons, mapData.grid.features.length) : 0} / {mapData?.grid?.features?.length || 0}
        </Text>
        <Text style={styles.debugText}>
          Filter: {filterRisk === 0 ? 'All' : filterRisk === 0.3 ? 'Med+' : filterRisk === 0.5 ? 'High+' : 'Crit'}
        </Text>
      </View>

      {/* Polygon Limit Control */}
      <View style={styles.limitControl}>
        <Text style={styles.limitLabel}>Show: {maxPolygons}</Text>
        <View style={styles.limitButtons}>
          <TouchableOpacity
            style={[styles.limitBtn, maxPolygons === 100 && styles.limitBtnActive]}
            onPress={() => setMaxPolygons(100)}
          >
            <Text style={[styles.limitBtnText, maxPolygons === 100 && styles.limitBtnTextActive]}>100</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.limitBtn, maxPolygons === 500 && styles.limitBtnActive]}
            onPress={() => setMaxPolygons(500)}
          >
            <Text style={[styles.limitBtnText, maxPolygons === 500 && styles.limitBtnTextActive]}>500</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.limitBtn, maxPolygons === 1000 && styles.limitBtnActive]}
            onPress={() => setMaxPolygons(1000)}
          >
            <Text style={[styles.limitBtnText, maxPolygons === 1000 && styles.limitBtnTextActive]}>1K</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Panel - Collapsible */}
      {showStats && mapData?.stats && (
        <View style={styles.floatingStatsPanel}>
          <View style={styles.statsPanelHeader}>
            <Text style={styles.statsPanelTitle}>📊 Risk Stats</Text>
            <TouchableOpacity onPress={() => setShowStats(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.miniStatsGrid}>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatValue}>{mapData.stats.total_cells}</Text>
              <Text style={styles.miniStatLabel}>Cells</Text>
            </View>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatValue}>{mapData.stats.high_risk_count}</Text>
              <Text style={styles.miniStatLabel}>High Risk</Text>
            </View>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatValue}>{mapData.stats.critical_count}</Text>
              <Text style={styles.miniStatLabel}>Critical</Text>
            </View>
          </View>
        </View>
      )}

      {/* Show Stats Button */}
      {!showStats && (
        <TouchableOpacity
          style={styles.showStatsButton}
          onPress={() => setShowStats(true)}
        >
          <Text style={styles.showStatsButtonText}>📊</Text>
        </TouchableOpacity>
      )}

      {/* Filter Controls */}
      <View style={styles.floatingFilterPanel}>
        <Text style={styles.filterPanelTitle}>Filter</Text>
        <View style={styles.filterButtonsCompact}>
          <TouchableOpacity
            style={[styles.filterBtnCompact, filterRisk === 0 && styles.filterBtnCompactActive]}
            onPress={() => setFilterRisk(0)}
          >
            <Text style={[styles.filterBtnCompactText, filterRisk === 0 && styles.filterBtnCompactTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtnCompact, filterRisk === 0.3 && styles.filterBtnCompactActive]}
            onPress={() => setFilterRisk(0.3)}
          >
            <Text style={[styles.filterBtnCompactText, filterRisk === 0.3 && styles.filterBtnCompactTextActive]}>
              Med+
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtnCompact, filterRisk === 0.5 && styles.filterBtnCompactActive]}
            onPress={() => setFilterRisk(0.5)}
          >
            <Text style={[styles.filterBtnCompactText, filterRisk === 0.5 && styles.filterBtnCompactTextActive]}>
              High+
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtnCompact, filterRisk === 0.7 && styles.filterBtnCompactActive]}
            onPress={() => setFilterRisk(0.7)}
          >
            <Text style={[styles.filterBtnCompactText, filterRisk === 0.7 && styles.filterBtnCompactTextActive]}>
              Crit
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.filterHint}>⚠️ Filters on backend</Text>
      </View>

      {/* Legend */}
      <View style={styles.floatingLegend}>
        <Text style={styles.legendTitle}>Risk</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#2ecc71' }]} />
          <Text style={styles.legendTextCompact}>Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#f1c40f' }]} />
          <Text style={styles.legendTextCompact}>Med</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#e67e22' }]} />
          <Text style={styles.legendTextCompact}>High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#e74c3c' }]} />
          <Text style={styles.legendTextCompact}>Crit</Text>
        </View>
      </View>
    </View>
  );
}

// Route Planning Screen
function RoutePlanningScreen() {
  const [startLat, setStartLat] = useState('28.65');
  const [startLon, setStartLon] = useState('77.25');
  const [endLat, setEndLat] = useState('28.68');
  const [endLon, setEndLon] = useState('77.30');
  const [profile, setProfile] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const presetLocations = [
    { name: 'Preet Vihar', lat: 28.70, lon: 77.30 },
    { name: 'Mayur Vihar', lat: 28.61, lon: 77.30 },
    { name: 'Laxmi Nagar', lat: 28.64, lon: 77.28 },
    { name: 'Gandhi Nagar', lat: 28.67, lon: 77.25 },
  ];

  const handleCalculateRoute = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/route?` +
          `start_lat=${startLat}&start_lon=${startLon}&` +
          `end_lat=${endLat}&end_lon=${endLon}&` +
          `profile=${profile}`
      );

      if (!response.ok) throw new Error('Failed to calculate route');
      const data = await response.json();
      setRouteInfo(data);
    } catch (err: any) {
      setError(err.message + '. Check backend at ' + API_BASE_URL);
    } finally {
      setLoading(false);
    }
  };

  // Render route on map
  const renderRoute = () => {
    if (!routeInfo?.route?.geometry?.coordinates) return null;

    const coordinates = routeInfo.route.geometry.coordinates.map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));

    return (
      <Polyline
        coordinates={coordinates}
        strokeColor="#3b82f6"
        strokeWidth={4}
      />
    );
  };

  return (
    <View style={styles.mapScreenContainer}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: parseFloat(startLat),
          longitude: parseFloat(startLon),
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={() => console.log('Route map is ready')}
      >
        {renderRoute()}
      </MapView>
      
      {/* Debug info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Route: {routeInfo ? '✓ Loaded' : '✗ No route'}
        </Text>
      </View>

      {/* Route Planning Panel */}
      <ScrollView style={styles.floatingRoutePanel}>
        <Text style={styles.routePanelTitle}>🗺️ Route Planning</Text>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>📍 Start</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputSmall}
              placeholder="Lat"
              value={startLat}
              onChangeText={setStartLat}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={styles.inputSmall}
              placeholder="Lon"
              value={startLon}
              onChangeText={setStartLon}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>🎯 End</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputSmall}
              placeholder="Lat"
              value={endLat}
              onChangeText={setEndLat}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              style={styles.inputSmall}
              placeholder="Lon"
              value={endLon}
              onChangeText={setEndLon}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View style={styles.presetButtonsCompact}>
          {presetLocations.map((loc, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.presetBtnCompact}
              onPress={() => {
                setStartLat(loc.lat.toString());
                setStartLon(loc.lon.toString());
              }}
            >
              <Text style={styles.presetBtnTextCompact}>{loc.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.modeButtonsCompact}>
          {['driving', 'walking', 'cycling'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtnCompact, profile === mode && styles.modeBtnCompactActive]}
              onPress={() => setProfile(mode)}
            >
              <Text style={[styles.modeBtnTextCompact, profile === mode && styles.modeBtnCompactTextActive]}>
                {mode === 'driving' ? '🚗' : mode === 'walking' ? '🚶' : '🚴'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.calculateBtnCompact, loading && styles.btnDisabled]}
          onPress={handleCalculateRoute}
          disabled={loading}
        >
          <Text style={styles.calculateBtnText}>
            {loading ? '⏳ Calculating...' : '🔍 Find Route'}
          </Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>⚠️ {error}</Text>
          </View>
        )}

        {routeInfo && (
          <View style={styles.routeResultBox}>
            <Text style={styles.routeResultTitle}>📊 Summary</Text>
            <Text style={styles.routeResultText}>
              Distance: {routeInfo.route.properties.distance_km.toFixed(2)} km
            </Text>
            <Text style={styles.routeResultText}>
              Duration: {routeInfo.route.properties.duration_min.toFixed(0)} min
            </Text>
            <View style={styles.riskBadgeContainer}>
              <Text style={styles.routeResultText}>Risk: </Text>
              <View style={[styles.riskBadgeSmall, { backgroundColor: routeInfo.risk_analysis.color }]}>
                <Text style={styles.riskBadgeText}>{routeInfo.risk_analysis.risk_level}</Text>
              </View>
            </View>
            {routeInfo.risk_analysis.warning_count > 0 && (
              <Text style={styles.warningTextSmall}>
                ⚠️ {routeInfo.risk_analysis.warning_count} high-risk segment(s)
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Main Modal Component
export default function Modal() {
  const [currentScreen, setCurrentScreen] = useState<string>(SCREENS.MAP);

  return (
    <View style={styles.appContainer}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delhi Waterlogging Monitor</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, currentScreen === SCREENS.MAP && styles.tabActive]}
          onPress={() => setCurrentScreen(SCREENS.MAP)}
        >
          <Text style={[styles.tabText, currentScreen === SCREENS.MAP && styles.tabTextActive]}>
            🗺️ Risk Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, currentScreen === SCREENS.ROUTE && styles.tabActive]}
          onPress={() => setCurrentScreen(SCREENS.ROUTE)}
        >
          <Text style={[styles.tabText, currentScreen === SCREENS.ROUTE && styles.tabTextActive]}>
            🚗 Routes
          </Text>
        </TouchableOpacity>
      </View>

      {currentScreen === SCREENS.MAP ? <WaterloggingMapScreen /> : <RoutePlanningScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#3b82f6',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  mapScreenContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  errorHint: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
  floatingStatsPanel: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 200,
  },
  statsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsPanelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  showStatsButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  showStatsButtonText: {
    fontSize: 20,
  },
  miniStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  miniStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  miniStatLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  floatingFilterPanel: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  filterPanelTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  filterButtonsCompact: {
    gap: 6,
  },
  filterBtnCompact: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  filterBtnCompactActive: {
    backgroundColor: '#3b82f6',
  },
  filterBtnCompactText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  filterBtnCompactTextActive: {
    color: 'white',
  },
  floatingLegend: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1f2937',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendBox: {
    width: 14,
    height: 14,
    marginRight: 6,
    borderRadius: 2,
  },
  legendTextCompact: {
    fontSize: 10,
    color: '#4b5563',
  },
  floatingRoutePanel: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%',
    width: 280,
  },
  routePanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f2937',
  },
  inputSection: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    color: '#374151',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  inputSmall: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    fontSize: 12,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  presetButtonsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetBtnCompact: {
    flex: 1,
    minWidth: '48%',
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  presetBtnTextCompact: {
    color: '#1e40af',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  modeButtonsCompact: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  modeBtnCompact: {
    flex: 1,
    padding: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    alignItems: 'center',
  },
  modeBtnCompactActive: {
    backgroundColor: '#3b82f6',
  },
  modeBtnTextCompact: {
    fontSize: 16,
  },
  modeBtnCompactTextActive: {
    fontSize: 16,
  },
  calculateBtnCompact: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: {
    backgroundColor: '#9ca3af',
  },
  calculateBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  errorBoxText: {
    color: '#991b1b',
    fontSize: 11,
  },
  routeResultBox: {
    backgroundColor: '#f0f9ff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  routeResultTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1e40af',
  },
  routeResultText: {
    fontSize: 12,
    color: '#1f2937',
    marginBottom: 4,
  },
  riskBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  warningTextSmall: {
    color: '#854d0e',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 6,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  limitControl: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  limitLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#1f2937',
  },
  limitButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  limitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  limitBtnActive: {
    backgroundColor: '#10b981',
  },
  limitBtnText: {
    fontSize: 9,
    color: '#374151',
    fontWeight: '600',
  },
  limitBtnTextActive: {
    color: 'white',
  },
  filterHint: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
});