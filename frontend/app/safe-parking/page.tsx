'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL, useSafeParkingAPI } from '@/lib/api';
import { Navigation, Loader, AlertTriangle, MapPin, Clock, Route } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline, Polygon } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMap';

interface ParkingLocation {
  name: string;
  lat: number | null;
  lon: number | null;
  risk: string | null;
  distance_m: number | null;
  final_score: number | null;
  route: { lat: number; lon: number }[] | null;
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

// Add this function in your SafeParkingPage component (after the imports, before the component)

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!API_KEY) {
    return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${API_KEY}&result_type=neighborhood|sublocality|locality`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];

      // Try to get neighborhood or sublocality first
      const components = result.address_components || [];
      for (const component of components) {
        if (component.types.includes('neighborhood') ||
          component.types.includes('sublocality_level_1') ||
          component.types.includes('sublocality')) {
          return component.long_name;
        }
      }

      // Fallback to first part of formatted address
      const formatted = result.formatted_address || '';
      const parts = formatted.split(',');
      return parts[0] || `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    }

    return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  }
};

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

const getRiskColor = (riskScore: number): string => {
  if (riskScore > 0.7) return '#e74c3c';
  if (riskScore > 0.5) return '#e67e22';
  if (riskScore > 0.3) return '#f1c40f';
  return '#2ecc71';
};

export default function SafeParkingPage() {
  const safeParkingAPI = useSafeParkingAPI();
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
  const [selectedOrigin, setSelectedOrigin] = useState(false);
  const [selectedParking, setSelectedParking] = useState<number | null>(null);

  // const { isLoaded, loadError } = useJsApiLoader({
  //   id: 'google-map-script', // MUST be same everywhere
  //   googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  //   libraries: ['places', 'visualization'], // include ALL needed libs
  //   language: 'en',
  //   region: 'US',
  // })

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const parseNumber = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const resolveLocation = async (query: string): Promise<ResolvedLocation | null> => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const data = await safeParkingAPI.geocode(trimmed);
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0] as ResolvedLocation;
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
      const data = await safeParkingAPI.getRecommended({
        lat: resolvedOrigin.lat,
        lon: resolvedOrigin.lon,
        radius: (parseNumber(radius) ?? 2) * 1000,
        limit: parseNumber(limit) ?? 3,
      });

      const recommended = (data.locations || []) as ParkingLocation[];

      // Enrich with both route data AND location names
      const withRouteData = await Promise.all(
        recommended.map(async (loc) => {
          if (loc.lat === null || loc.lon === null) {
            return { ...loc, route_data: null };
          }

          try {
            // Fetch route data
            const routeData = await safeParkingAPI.getRoute({
              start_lat: resolvedOrigin!.lat,
              start_lon: resolvedOrigin!.lon,
              end_lat: loc.lat,
              end_lon: loc.lon,
              profile,
            });

            // Fetch location name via reverse geocoding
            const locationName = await reverseGeocode(loc.lat, loc.lon);

            return {
              ...loc,
              name: locationName,  // Update the name
              route_data: routeData as RouteData
            };
          } catch {
            // Even if route fails, try to get the name
            const locationName = await reverseGeocode(loc.lat, loc.lon);
            return {
              ...loc,
              name: locationName,
              route_data: null
            };
          }
        })
      );

      setLocations(withRouteData);
      setSelectedIndex(0);
      setLastSearch(`From ${resolvedOrigin.name} within ${radius} km`);
    } catch (err: any) {
      setError(err?.message || 'Failed to load safe parking locations');
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentOrigin: ResolvedLocation = {
          name: 'Current Location',
          lat: Number(pos.coords.latitude.toFixed(6)),
          lon: Number(pos.coords.longitude.toFixed(6)),
        };
        setLocationQuery(currentOrigin.name);
        fetchNearby(currentOrigin);
      },
      () => {
        setLoading(false);
        setError('Location permission denied. Enter location name manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const selectedLocation = locations[selectedIndex];
  const selectedRoute = selectedLocation?.route_data;

  const renderGridCells = () => {
    if (!gridData?.features) return null;

    return gridData.features.map((feature: any, idx: number) => {
      const coordinates = feature.geometry.coordinates[0];
      const paths = coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      const riskScore = feature.properties.risk_score || 0;
      const fillColor = getRiskColor(riskScore);

      return (
        <Polygon
          key={`grid-${idx}`}
          paths={paths}
          options={{
            fillColor: fillColor,
            fillOpacity: 0.45,
            strokeColor: 'white',
            strokeWeight: 0.3,
            strokeOpacity: 0.8,
          }}
        />
      );
    });
  };

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

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
          <Loader className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-800/50 p-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20">
                  <MapPin className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-slate-900 to-cyan-700 dark:from-white dark:to-cyan-400 bg-clip-text text-transparent">
                  Safe Parking Finder
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 ml-14">
                Find elevated parking locations with minimal flood risk
              </p>
            </div>
            <button
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={useMyLocation}
              disabled={loading}
            >
              <Navigation className="w-5 h-5" />
              Use My Location
            </button>
          </div>
        </div>

        {/* Search Filters */}
        <div className="mt-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-800/50 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Your Location
              </label>
              <input
                className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500 px-4 py-2.5 transition-colors outline-none"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="e.g., Connaught Place"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Search Radius (km)
              </label>
              <input
                type="number"
                className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500 px-4 py-2.5 transition-colors outline-none"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="4"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Max Results
              </label>
              <input
                type="number"
                className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500 px-4 py-2.5 transition-colors outline-none"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="3"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Travel Mode
              </label>
              <select
                className="w-full rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500 px-4 py-2.5 transition-colors outline-none"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
              >
                <option value="driving">🚗 Driving</option>
                <option value="walking">🚶 Walking</option>
                <option value="cycling">🚴 Cycling</option>
              </select>
            </div>
          </div>

          {origin && (
            <div className="mt-4 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 text-sm">
              <span className="font-semibold text-cyan-700 dark:text-cyan-300">Starting from:</span>{' '}
              <span className="text-cyan-900 dark:text-cyan-100">
                {origin.name} ({origin.lat.toFixed(5)}, {origin.lon.toFixed(5)})
              </span>
            </div>
          )}

          <button
            className="mt-4 w-full px-6 py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 hover:from-slate-800 hover:to-slate-600 dark:hover:from-slate-100 dark:hover:to-slate-300 text-white dark:text-slate-900 font-semibold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => fetchNearby()}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader className="w-5 h-5 animate-spin" /> Searching for safe parking...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <MapPin className="w-5 h-5" />
                Find Safe Parking
              </span>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Map */}
        <div className="mt-6 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl">
          <div className="h-[500px] w-full">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={origin ? { lat: origin.lat, lng: origin.lon } : { lat: 28.6139, lng: 77.209 }}
              zoom={origin ? 13 : 11}
              options={mapOptions}
            >
              {/* Grid Overlay */}
              {renderGridCells()}

              {/* Origin Marker */}
              {origin && (
                <>
                  <Marker
                    position={{ lat: origin.lat, lng: origin.lon }}
                    onClick={() => setSelectedOrigin(true)}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    }}
                  />
                  {selectedOrigin && (
                    <InfoWindow
                      position={{ lat: origin.lat, lng: origin.lon }}
                      onCloseClick={() => setSelectedOrigin(false)}
                    >
                      <div className="p-1">
                        <div className="font-bold text-blue-600">📍 Start Location</div>
                        <div className="text-sm mt-1">{origin.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {origin.lat.toFixed(5)}, {origin.lon.toFixed(5)}
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </>
              )}

              {/* Parking Markers */}
              {locations.map((loc, idx) =>
                loc.lat !== null && loc.lon !== null ? (
                  <div key={`parking-${idx}`}>
                    <Marker
                      position={{ lat: loc.lat, lng: loc.lon }}
                      onClick={() => {
                        setSelectedParking(idx);
                        setSelectedIndex(idx);
                      }}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                      }}
                    />
                    {selectedParking === idx && (
                      <InfoWindow
                        position={{ lat: loc.lat, lng: loc.lon }}
                        onCloseClick={() => setSelectedParking(null)}
                      >
                        <div className="p-1">
                          <div className="font-bold text-green-600">🅿️ {loc.name || 'Safe Parking'}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Risk: {loc.risk ?? 'Unknown'}
                          </div>
                          {loc.distance_m && (
                            <div className="text-xs text-slate-500">
                              {(loc.distance_m / 1000).toFixed(2)} km away
                            </div>
                          )}
                        </div>
                      </InfoWindow>
                    )}
                  </div>
                ) : null
              )}

              {/* Selected Route */}
              {selectedRoute && (
                <Polyline
                  path={selectedRoute.route.geometry.coordinates.map(([lon, lat]) => ({ lat, lng: lon }))}
                  options={{
                    strokeColor: selectedRoute.risk_analysis.color,
                    strokeWeight: 5,
                    strokeOpacity: 0.9,
                  }}
                />
              )}
            </GoogleMap>
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {locations.length > 0 ? `Found ${locations.length} Safe Location${locations.length > 1 ? 's' : ''}` : 'Search Results'}
            </h2>
            {lastSearch && (
              <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {lastSearch}
              </span>
            )}
          </div>

          {locations.length === 0 && !loading && !error && (
            <div className="text-center py-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <MapPin className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                No locations found. Try expanding your search radius.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {locations.map((loc, index) => (
              <div
                key={index}
                className={`group rounded-2xl border-2 bg-white dark:bg-slate-900 p-6 cursor-pointer transition-all duration-200 hover:shadow-xl ${index === selectedIndex
                  ? 'border-cyan-500 shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700'
                  }`}
                onClick={() => setSelectedIndex(index)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {loc.name || `Parking at (${loc.lat?.toFixed(4)}, ${loc.lon?.toFixed(4)})`}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Risk Level: <span className="font-semibold">{loc.risk ?? 'Unknown'}</span>
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${index === selectedIndex
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                    #{index + 1}
                  </div>
                </div>

                <div className="space-y-3">
                  {loc.distance_m && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                        <Navigation className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {(loc.distance_m / 1000).toFixed(2)} km
                        </div>
                        <div className="text-xs text-slate-500">Distance</div>
                      </div>
                    </div>
                  )}

                  {loc.route_data && (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                          <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {loc.route_data.route.properties.distance_km.toFixed(2)} km
                          </div>
                          <div className="text-xs text-slate-500">Route Distance</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {loc.route_data.route.properties.duration_min.toFixed(0)} min
                          </div>
                          <div className="text-xs text-slate-500">Travel Time</div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Route Risk:</span>
                          <span
                            className="text-xs font-bold px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: loc.route_data.risk_analysis.color }}
                          >
                            {loc.route_data.risk_analysis.risk_level}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  📍 {loc.lat?.toFixed(5) ?? '-'}, {loc.lon?.toFixed(5) ?? '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
