import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useColorScheme } from 'nativewind';
import { API_BASE_URL } from '../../lib/config';
import { getErrorMessage } from '../../lib/utils';


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
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

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
                setError(getErrorMessage(err));
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
                <Text style={[styles.loadingText, isDark && { color: '#94a3b8' }]}>Loading map data...</Text>
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
                    strokeColor={isDark ? "#94a3b8" : "#4a5568"}
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
                userInterfaceStyle={isDark ? 'dark' : 'light'}
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
            <View style={[styles.limitControl, isDark && { backgroundColor: '#0f172a' }]}>
                <Text style={[styles.limitLabel, isDark && { color: '#e2e8f0' }]}>Show: {maxPolygons}</Text>
                <View style={styles.limitButtons}>
                    <TouchableOpacity
                        style={[styles.limitBtn, isDark && { backgroundColor: '#1e293b' }, maxPolygons === 100 && styles.limitBtnActive]}
                        onPress={() => setMaxPolygons(100)}
                    >
                        <Text style={[styles.limitBtnText, isDark && { color: '#94a3b8' }, maxPolygons === 100 && styles.limitBtnTextActive]}>100</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.limitBtn, isDark && { backgroundColor: '#1e293b' }, maxPolygons === 500 && styles.limitBtnActive]}
                        onPress={() => setMaxPolygons(500)}
                    >
                        <Text style={[styles.limitBtnText, isDark && { color: '#94a3b8' }, maxPolygons === 500 && styles.limitBtnTextActive]}>500</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.limitBtn, isDark && { backgroundColor: '#1e293b' }, maxPolygons === 1000 && styles.limitBtnActive]}
                        onPress={() => setMaxPolygons(1000)}
                    >
                        <Text style={[styles.limitBtnText, isDark && { color: '#94a3b8' }, maxPolygons === 1000 && styles.limitBtnTextActive]}>1K</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Panel - Collapsible */}
            {showStats && mapData?.stats && (
                <View style={[styles.floatingStatsPanel, isDark && { backgroundColor: '#0f172a' }]}>
                    <View style={styles.statsPanelHeader}>
                        <Text style={[styles.statsPanelTitle, isDark && { color: 'white' }]}>📊 Risk Stats</Text>
                        <TouchableOpacity onPress={() => setShowStats(false)}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.miniStatsGrid}>
                        <View style={styles.miniStatBox}>
                            <Text style={styles.miniStatValue}>{mapData.stats.total_cells}</Text>
                            <Text style={[styles.miniStatLabel, isDark && { color: '#94a3b8' }]}>Cells</Text>
                        </View>
                        <View style={styles.miniStatBox}>
                            <Text style={styles.miniStatValue}>{mapData.stats.high_risk_count}</Text>
                            <Text style={[styles.miniStatLabel, isDark && { color: '#94a3b8' }]}>High Risk</Text>
                        </View>
                        <View style={styles.miniStatBox}>
                            <Text style={styles.miniStatValue}>{mapData.stats.critical_count}</Text>
                            <Text style={[styles.miniStatLabel, isDark && { color: '#94a3b8' }]}>Critical</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Show Stats Button */}
            {!showStats && (
                <TouchableOpacity
                    style={[styles.showStatsButton, isDark && { backgroundColor: '#0f172a' }]}
                    onPress={() => setShowStats(true)}
                >
                    <Text style={styles.showStatsButtonText}>📊</Text>
                </TouchableOpacity>
            )}

            {/* Filter Controls */}
            <View style={[styles.floatingFilterPanel, isDark && { backgroundColor: '#0f172a' }]}>
                <Text style={[styles.filterPanelTitle, isDark && { color: 'white' }]}>Filter</Text>
                <View style={styles.filterButtonsCompact}>
                    <TouchableOpacity
                        style={[styles.filterBtnCompact, isDark && { backgroundColor: '#1e293b' }, filterRisk === 0 && styles.filterBtnCompactActive]}
                        onPress={() => setFilterRisk(0)}
                    >
                        <Text style={[styles.filterBtnCompactText, isDark && { color: '#94a3b8' }, filterRisk === 0 && styles.filterBtnCompactTextActive]}>
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtnCompact, isDark && { backgroundColor: '#1e293b' }, filterRisk === 0.3 && styles.filterBtnCompactActive]}
                        onPress={() => setFilterRisk(0.3)}
                    >
                        <Text style={[styles.filterBtnCompactText, isDark && { color: '#94a3b8' }, filterRisk === 0.3 && styles.filterBtnCompactTextActive]}>
                            Med+
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtnCompact, isDark && { backgroundColor: '#1e293b' }, filterRisk === 0.5 && styles.filterBtnCompactActive]}
                        onPress={() => setFilterRisk(0.5)}
                    >
                        <Text style={[styles.filterBtnCompactText, isDark && { color: '#94a3b8' }, filterRisk === 0.5 && styles.filterBtnCompactTextActive]}>
                            High+
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtnCompact, isDark && { backgroundColor: '#1e293b' }, filterRisk === 0.7 && styles.filterBtnCompactActive]}
                        onPress={() => setFilterRisk(0.7)}
                    >
                        <Text style={[styles.filterBtnCompactText, isDark && { color: '#94a3b8' }, filterRisk === 0.7 && styles.filterBtnCompactTextActive]}>
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
    const [startQuery, setStartQuery] = useState('Connaught Place');
    const [endQuery, setEndQuery] = useState('India Gate');
    const [profile, setProfile] = useState('driving');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [routeInfo, setRouteInfo] = useState<any>(null);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const presetLocations = [
        { name: 'Preet Vihar' },
        { name: 'Mayur Vihar' },
        { name: 'Laxmi Nagar' },
        { name: 'Gandhi Nagar' },
    ];

    const resolveLocation = async (query: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/geocode?query=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Geocoding failed');
            const data = await res.json();
            if (data.length === 0) throw new Error(`Location not found: ${query}`);
            return data[0]; // Return first result {name, lat, lon}
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleCalculateRoute = async () => {
        if (!startQuery.trim() || !endQuery.trim()) {
            setError('Please enter start and end locations');
            return;
        }

        setLoading(true);
        setError(null);
        setRouteInfo(null);

        try {
            // 1. Geocode locations
            const startLoc = await resolveLocation(startQuery);
            const endLoc = await resolveLocation(endQuery);

            if (!startLoc) throw new Error(`Could not find start location: "${startQuery}"`);
            if (!endLoc) throw new Error(`Could not find end location: "${endQuery}"`);

            // 2. Calculate route
            const response = await fetch(
                `${API_BASE_URL}/api/route?` +
                `start_lat=${startLoc.lat}&start_lon=${startLoc.lon}&` +
                `end_lat=${endLoc.lat}&end_lon=${endLoc.lon}&` +
                `profile=${profile}`
            );

            if (!response.ok) throw new Error('Failed to calculate route');
            const data = await response.json();
            setRouteInfo(data);
        } catch (err: any) {
            setError(getErrorMessage(err));
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
                    latitude: 28.6139,
                    longitude: 77.2090,
                    latitudeDelta: 0.15,
                    longitudeDelta: 0.15,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                onMapReady={() => console.log('Route map is ready')}
                userInterfaceStyle={isDark ? 'dark' : 'light'}
            >
                {renderRoute()}
            </MapView>

            {/* Top Search Bar - Google Maps Style */}
            <View style={[styles.topSearchContainer, isDark && { backgroundColor: '#0f172a' }]}>
                <View style={styles.searchInputsWrapper}>
                    {/* Start Input */}
                    <View style={styles.inputRow}>
                        <Text style={styles.inputIcon}>�</Text>
                        <TextInput
                            style={[styles.searchInput, isDark && { backgroundColor: '#1e293b', color: 'white' }]}
                            placeholder="Your location"
                            value={startQuery}
                            onChangeText={setStartQuery}
                            placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                        />
                    </View>

                    {/* Swap Button */}
                    <TouchableOpacity
                        style={styles.swapButton}
                        onPress={() => {
                            const temp = startQuery;
                            setStartQuery(endQuery);
                            setEndQuery(temp);
                        }}
                    >
                        <Text style={styles.swapIcon}>⇅</Text>
                    </TouchableOpacity>

                    {/* End Input */}
                    <View style={styles.inputRow}>
                        <Text style={styles.inputIcon}>🔴</Text>
                        <TextInput
                            style={[styles.searchInput, isDark && { backgroundColor: '#1e293b', color: 'white' }]}
                            placeholder="Choose destination"
                            value={endQuery}
                            onChangeText={setEndQuery}
                            placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                        />
                    </View>
                </View>

                {/* Mode Selection */}
                <View style={styles.modeSelector}>
                    {['driving', 'walking', 'cycling'].map((mode) => (
                        <TouchableOpacity
                            key={mode}
                            style={[styles.modeButton, profile === mode && styles.modeButtonActive]}
                            onPress={() => setProfile(mode)}
                        >
                            <Text style={[styles.modeIcon, profile === mode && styles.modeIconActive]}>
                                {mode === 'driving' ? '🚗' : mode === 'walking' ? '🚶' : '🚴'}
                            </Text>
                            <Text style={[styles.modeLabel, isDark && { color: '#94a3b8' }, profile === mode && styles.modeLabelActive]}>
                                {mode === 'driving' ? 'Drive' : mode === 'walking' ? 'Walk' : 'Bike'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search Button */}
                <TouchableOpacity
                    style={[styles.searchRouteButton, loading && styles.btnDisabled]}
                    onPress={handleCalculateRoute}
                    disabled={loading}
                >
                    <Text style={styles.searchRouteButtonText}>
                        {loading ? '⏳ Searching...' : '🔍 Search'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Bottom Sheet - Route Details */}
            {routeInfo ? (
                <View style={[styles.bottomSheet, isDark && { backgroundColor: '#0f172a' }]}>
                    <View style={styles.routeDetailsHeader}>
                        <View style={styles.tripTimeContainer}>
                            <Text style={[styles.tripTime, isDark && { color: 'white' }]}>
                                {routeInfo.route.properties.duration_min.toFixed(0)} min
                            </Text>
                            <Text style={[styles.tripDistance, isDark && { color: '#94a3b8' }]}>
                                ({routeInfo.route.properties.distance_km.toFixed(1)} km)
                            </Text>
                        </View>
                        <View style={[styles.riskBadgeLarge, { backgroundColor: routeInfo.risk_analysis.color }]}>
                            <Text style={styles.riskBadgeText}>{routeInfo.risk_analysis.risk_level}</Text>
                        </View>
                    </View>

                    {routeInfo.risk_analysis.warning_count > 0 && (
                        <View style={styles.warningBanner}>
                            <Text style={styles.warningBannerText}>
                                ⚠️ Route passes through {routeInfo.risk_analysis.warning_count} high-risk area(s)
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.startButton}>
                        <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>
                </View>
            ) : error ? (
                <View style={[styles.bottomSheet, isDark && { backgroundColor: '#0f172a' }]}>
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorIcon}>⚠️</Text>
                        <Text style={[styles.errorMessage, isDark && { color: '#fca5a5' }]}>{error}</Text>
                    </View>
                </View>
            ) : null}
        </View>
    );
}

// Main Map Screen Component with Internal Routing for Map/Route
export default function MapTabScreen() {
    const [currentScreen, setCurrentScreen] = useState<string>(SCREENS.MAP);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <SafeAreaView style={[styles.appContainer, isDark && { backgroundColor: '#020617' }]} edges={['top']}>
            <View style={[styles.header, isDark && { backgroundColor: '#0f172a', borderBottomColor: '#1e293b', borderBottomWidth: 1 }]}>
                <Text style={styles.headerTitle}>Delhi Waterlogging Monitor</Text>
            </View>

            <View style={[styles.tabBar, isDark && { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' }]}>
                <TouchableOpacity
                    style={[styles.tab, currentScreen === SCREENS.MAP && styles.tabActive, isDark && currentScreen === SCREENS.MAP && { borderBottomColor: '#38bdf8' }]}
                    onPress={() => setCurrentScreen(SCREENS.MAP)}
                >
                    <Text style={[styles.tabText, currentScreen === SCREENS.MAP && styles.tabTextActive, isDark && { color: '#94a3b8' }, isDark && currentScreen === SCREENS.MAP && { color: '#38bdf8' }]}>
                        🗺️ Risk Map
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, currentScreen === SCREENS.ROUTE && styles.tabActive, isDark && currentScreen === SCREENS.ROUTE && { borderBottomColor: '#38bdf8' }]}
                    onPress={() => setCurrentScreen(SCREENS.ROUTE)}
                >
                    <Text style={[styles.tabText, currentScreen === SCREENS.ROUTE && styles.tabTextActive, isDark && { color: '#94a3b8' }, isDark && currentScreen === SCREENS.ROUTE && { color: '#38bdf8' }]}>
                        🚗 Routes
                    </Text>
                </TouchableOpacity>
            </View>

            {currentScreen === SCREENS.MAP ? <WaterloggingMapScreen /> : <RoutePlanningScreen />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    header: {
        backgroundColor: '#3b82f6',
        paddingVertical: 12,
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
        padding: 12,
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
        borderRadius: 8,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    legendTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#4b5563',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    legendBox: {
        width: 10,
        height: 10,
        borderRadius: 2,
        marginRight: 4,
    },
    legendTextCompact: {
        fontSize: 9,
        color: '#6b7280',
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 10,
        borderColor: '#e5e7eb',
        borderWidth: 1,
        marginBottom: 8,
    },
    inputSmall: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 10,
        borderColor: '#e5e7eb',
        borderWidth: 1,
    },
    inputSection: {
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#4b5563',
    },
    presetButtonsCompact: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    presetBtnCompact: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    presetBtnTextCompact: {
        fontSize: 11,
        color: '#1d4ed8',
        fontWeight: '500',
    },
    modeButtonsCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 4,
    },
    modeBtnCompact: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    modeBtnCompactActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modeBtnTextCompact: {
        fontSize: 14,
    },
    modeBtnCompactTextActive: {
        fontWeight: 'bold',
    },
    calculateBtnCompact: {
        backgroundColor: '#3b82f6',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    btnDisabled: {
        opacity: 0.7,
    },
    calculateBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    errorBox: {
        marginTop: 12,
        padding: 10,
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    errorBoxText: {
        color: '#b91c1c',
        fontSize: 12,
        textAlign: 'center',
    },
    routeResultBox: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f0f9ff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0f2fe',
    },
    routeResultTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 8,
        color: '#0369a1',
    },
    routeResultText: {
        fontSize: 12,
        marginBottom: 4,
        color: '#0c4a6e',
    },
    riskBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    riskBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    riskBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    warningTextSmall: {
        marginTop: 6,
        fontSize: 11,
        color: '#d97706',
        fontWeight: '500',
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
    // Google Maps-Style Navigation UI
    topSearchContainer: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 10,
    },
    searchInputsWrapper: {
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputIcon: {
        fontSize: 16,
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#1f2937',
    },
    swapButton: {
        position: 'absolute',
        right: 12,
        top: 28,
        backgroundColor: 'white',
        borderRadius: 20,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        zIndex: 2,
    },
    swapIcon: {
        fontSize: 18,
        color: '#3b82f6',
    },
    modeSelector: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        padding: 4,
        marginBottom: 12,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        gap: 6,
    },
    modeButtonActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modeIcon: {
        fontSize: 18,
    },
    modeIconActive: {
        fontSize: 18,
    },
    modeLabel: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    modeLabelActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    searchRouteButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    searchRouteButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 12,
        zIndex: 9,
    },
    routeDetailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tripTimeContainer: {
        flex: 1,
    },
    tripTime: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    tripDistance: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    riskBadgeLarge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    warningBanner: {
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    warningBannerText: {
        color: '#92400e',
        fontSize: 13,
        fontWeight: '500',
    },
    startButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    startButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    errorIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 14,
        color: '#ef4444',
        textAlign: 'center',
    },
}); 
