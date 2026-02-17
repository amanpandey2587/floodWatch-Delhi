'use client';

import { useEffect, useState, useRef } from 'react';
import { API_BASE_URL, useSafeParkingAPI } from '@/lib/api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GoogleMap, useJsApiLoader, Polygon, Polyline, Marker, InfoWindow, Circle } from '@react-google-maps/api';

interface MapData {
  grid: any;
  wards: any;
  drains: any;
  stats: any;
}

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

// Add this before your component
const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 28.67,
  lng: 77.30
};

const mapOptions = {
  zoom: 12,
  mapTypeId: 'roadmap',
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  fullscreenControl: true,
};

// Color based on risk score
const getRiskColor = (riskScore: number): string => {
  if (riskScore > 0.7) return '#e74c3c'; // Critical - Red
  if (riskScore > 0.5) return '#e67e22'; // High - Orange
  if (riskScore > 0.3) return '#f1c40f'; // Medium - Yellow
  return '#2ecc71'; // Low - Green
};


export default function WaterloggingMap() {
  const safeParkingAPI = useSafeParkingAPI();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState(0);
  const [routeData, setRouteData] = useState<any>(null);
  const [clickMode, setClickMode] = useState<'start' | 'end' | null>(null);
  const [parkingLat, setParkingLat] = useState('');
  const [parkingLon, setParkingLon] = useState('');
  const [parkingRadius, setParkingRadius] = useState('2000');
  const [parkingLimit, setParkingLimit] = useState('3');
  const [parkingLoading, setParkingLoading] = useState(false);
  const [parkingError, setParkingError] = useState<string | null>(null);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);

  const handleRouteCalculated = (data: any) => {
    setRouteData(data);
  };

  const handleClearRoute = () => {
    setRouteData(null);
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (clickMode === 'start') {
      console.log('Start point set:', lat, lon);
    } else if (clickMode === 'end') {
      console.log('End point set:', lat, lon);
    }
  };

  const parseNumber = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const fetchNearbyParking = async (latValue?: number, lonValue?: number) => {
    const latNum = latValue ?? parseNumber(parkingLat);
    const lonNum = lonValue ?? parseNumber(parkingLon);

    if (latNum === null || lonNum === null) {
      setParkingError('Enter valid latitude and longitude.');
      return;
    }

    setParkingLoading(true);
    setParkingError(null);

    try {
      const data = await safeParkingAPI.getRecommended({
        lat: latNum,
        lon: lonNum,
        radius: parseNumber(parkingRadius) ?? 2000,
        limit: parseNumber(parkingLimit) ?? 3,
      });
      setParkingLocations(data.locations || []);
    } catch (err: any) {
      setParkingError(err?.message || 'Failed to load safe parking.');
    } finally {
      setParkingLoading(false);
    }
  };

  const fetchAllParking = async () => {
    const latNum = parseNumber(parkingLat) ?? center.lat;
    const lonNum = parseNumber(parkingLon) ?? center.lng;

    setParkingLoading(true);
    setParkingError(null);

    try {
      const data = await safeParkingAPI.getRecommended({
        lat: latNum,
        lon: lonNum,
        radius: Math.max(parseNumber(parkingRadius) ?? 2000, 10000),
        limit: Math.max(parseNumber(parkingLimit) ?? 3, 50),
      });
      setParkingLocations(data.locations || []);
    } catch (err: any) {
      setParkingError(err?.message || 'Failed to load safe parking.');
    } finally {
      setParkingLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setParkingError('Geolocation is not supported in this browser.');
      return;
    }

    setParkingLoading(true);
    setParkingError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latVal = Number(pos.coords.latitude.toFixed(6));
        const lonVal = Number(pos.coords.longitude.toFixed(6));
        setParkingLat(String(latVal));
        setParkingLon(String(lonVal));
        fetchNearbyParking(latVal, lonVal);
      },
      () => {
        setParkingLoading(false);
        setParkingError('Location permission denied.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const [selectedGrid, setSelectedGrid] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState(false);
  const [selectedStart, setSelectedStart] = useState(false);
  const [selectedEnd, setSelectedEnd] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', // MUST be same everywhere
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places', 'visualization'], // include ALL needed libs
    language: 'en',
    region: 'US',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [gridRes, wardsRes, drainsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/grid?risk_min=${filterRisk}`),
          fetch(`${API_BASE_URL}/api/wards`),
          fetch(`${API_BASE_URL}/api/drains`),
          fetch(`${API_BASE_URL}/api/stats`)
        ]);

        const [grid, wards, drains, stats] = await Promise.all([
          gridRes.json(),
          wardsRes.json(),
          drainsRes.json(),
          statsRes.json()
        ]);

        setMapData({ grid, wards, drains, stats });
        setLoading(false);
      } catch (err) {
        setError('Failed to load map data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, [filterRisk]);


  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-xl font-semibold text-slate-700 dark:text-slate-200">Loading Google Maps...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="text-slate-700 dark:text-slate-200 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const renderGridCells = () => {
    if (!mapData?.grid?.features) return null;

    return mapData.grid.features.map((feature: any, idx: number) => {
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
            fillOpacity: 0.7,
            strokeColor: 'white',
            strokeWeight: 0.5,
            strokeOpacity: 1,
          }}
          onClick={() => setSelectedGrid(feature)}
        />
      );
    });
  };

  return (
    <div className="relative h-screen w-full">

      <DraggableContainer defaultX={16} defaultY={16}>
        <div className="w-[320px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 shadow-lg backdrop-blur">
          <div className="drag-handle px-4 pt-3 text-sm font-semibold cursor-move select-none">Map Controls</div>
          <Accordion type="multiple" defaultValue={["risk", "route"]} className="px-4">
            {mapData?.stats && (
              <AccordionItem value="risk">
                <AccordionTrigger>East Delhi Risk Stats</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div><strong>Total Cells:</strong> {mapData.stats.total_cells}</div>
                    <div><strong>Avg Risk:</strong> {mapData.stats.avg_risk.toFixed(3)}</div>
                    <div><strong>High Risk:</strong> {mapData.stats.high_risk_count}</div>
                    <div><strong>Critical:</strong> {mapData.stats.critical_count}</div>
                    <div className="mt-3">
                      <strong>Distribution:</strong>
                      {Object.entries(mapData.stats.risk_distribution).map(([category, count]: [string, any]) => (
                        <div key={category} className="ml-2">
                          {category}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="parking">
              <AccordionTrigger>Safe Parking Nearby</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={useMyLocation}
                      className="flex-1 px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                      disabled={parkingLoading}
                    >
                      Use My Location
                    </button>
                    <button
                      onClick={fetchAllParking}
                      className="flex-1 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                      disabled={parkingLoading}
                    >
                      Show All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Latitude"
                      className="px-2 py-1 border rounded text-xs bg-white dark:bg-slate-900"
                      value={parkingLat}
                      onChange={(e) => setParkingLat(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Longitude"
                      className="px-2 py-1 border rounded text-xs bg-white dark:bg-slate-900"
                      value={parkingLon}
                      onChange={(e) => setParkingLon(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Radius (m)"
                      className="px-2 py-1 border rounded text-xs bg-white dark:bg-slate-900"
                      value={parkingRadius}
                      onChange={(e) => setParkingRadius(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Limit"
                      className="px-2 py-1 border rounded text-xs bg-white dark:bg-slate-900"
                      value={parkingLimit}
                      onChange={(e) => setParkingLimit(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => fetchNearbyParking()}
                    className="w-full px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                    disabled={parkingLoading}
                  >
                    {parkingLoading ? 'Searching...' : 'Find Parking'}
                  </button>

                  {parkingError && (
                    <div className="text-red-600 text-xs">{parkingError}</div>
                  )}

                  <div className="space-y-2">
                    {parkingLocations.length === 0 && !parkingLoading && !parkingError && (
                      <div className="text-slate-500 text-xs text-center py-2">
                        No locations found.
                      </div>
                    )}
                    {parkingLocations.map((loc) => (
                      <div key={loc.id} className="p-2 border rounded text-xs bg-slate-50 dark:bg-slate-800">
                        <div className="font-semibold">{loc.name}</div>
                        <div className="text-slate-600 dark:text-slate-400">{loc.address}</div>
                        <div className="text-slate-500 text-xs mt-1">
                          Ward {loc.ward_number} - {loc.distance_km ?? 'n/a'} km - Elev {loc.elevation_m} m
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="route">
              <AccordionTrigger>Route Planning</AccordionTrigger>
              <AccordionContent>
                <RoutePanelContent onRouteCalculated={handleRouteCalculated} onClearRoute={handleClearRoute} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="filter">
              <AccordionTrigger>Filter by Risk</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFilterRisk(0)}
                    className={`px-3 py-2 rounded text-xs font-semibold ${filterRisk === 0 ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterRisk(0.3)}
                    className={`px-3 py-2 rounded text-xs font-semibold ${filterRisk === 0.3 ? 'bg-yellow-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                  >
                    Medium+
                  </button>
                  <button
                    onClick={() => setFilterRisk(0.5)}
                    className={`px-3 py-2 rounded text-xs font-semibold ${filterRisk === 0.5 ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                  >
                    High+
                  </button>
                  <button
                    onClick={() => setFilterRisk(0.7)}
                    className={`px-3 py-2 rounded text-xs font-semibold ${filterRisk === 0.7 ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                  >
                    Critical
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DraggableContainer>

      {/* Map */}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        options={mapOptions}
        onClick={(e) => {
          if (e.latLng) {
            handleMapClick(e.latLng.lat(), e.latLng.lng());
          }
        }}
      >
        {/* Grid Cells */}
        {renderGridCells()}

        {/* Grid InfoWindow */}
        {selectedGrid && (
          <InfoWindow
            position={{
              lat: selectedGrid.geometry.coordinates[0][0][1],
              lng: selectedGrid.geometry.coordinates[0][0][0]
            }}
            onCloseClick={() => setSelectedGrid(null)}
          >
            <div className="text-xs">
              <strong>Cell #{selectedGrid.properties.cell_id || 'N/A'}</strong><br />
              Risk: {selectedGrid.properties.risk_category || 'Unknown'}<br />
              Score: {selectedGrid.properties.risk_score?.toFixed(3) || 'N/A'}<br />
              Elevation: {selectedGrid.properties.elevation_m?.toFixed(1) || 'N/A'} m<br />
              Rainfall: {selectedGrid.properties.rainfall_24h_mm?.toFixed(1) || 'N/A'} mm<br />
              Drain Dist: {selectedGrid.properties.drain_distance_m?.toFixed(0) || 'N/A'} m
            </div>
          </InfoWindow>
        )}

        {/* Route */}
        {routeData && (
          <>
            <Polyline
              path={routeData.route.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ lat, lng: lon }))}
              options={{
                strokeColor: routeData.risk_analysis.color,
                strokeWeight: 6,
                strokeOpacity: 0.8,
              }}
              onClick={() => setSelectedRoute(true)}
            />

            {selectedRoute && (
              <InfoWindow
                position={{
                  lat: routeData.route.geometry.coordinates[0][1],
                  lng: routeData.route.geometry.coordinates[0][0]
                }}
                onCloseClick={() => setSelectedRoute(false)}
              >
                <div className="text-xs">
                  <strong>Route Details</strong><br />
                  Distance: {routeData.route.properties.distance_km.toFixed(2)} km<br />
                  Duration: {routeData.route.properties.duration_min.toFixed(0)} min<br />
                  Risk: {routeData.risk_analysis.risk_level}
                </div>
              </InfoWindow>
            )}

            <Marker
              position={{ lat: routeData.waypoints.start.lat, lng: routeData.waypoints.start.lon }}
              onClick={() => setSelectedStart(true)}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
            />

            {selectedStart && (
              <InfoWindow
                position={{ lat: routeData.waypoints.start.lat, lng: routeData.waypoints.start.lon }}
                onCloseClick={() => setSelectedStart(false)}
              >
                <div className="text-xs">
                  <strong>START</strong><br />
                  Lat: {routeData.waypoints.start.lat.toFixed(4)}<br />
                  Lon: {routeData.waypoints.start.lon.toFixed(4)}
                </div>
              </InfoWindow>
            )}

            <Marker
              position={{ lat: routeData.waypoints.end.lat, lng: routeData.waypoints.end.lon }}
              onClick={() => setSelectedEnd(true)}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }}
            />

            {selectedEnd && (
              <InfoWindow
                position={{ lat: routeData.waypoints.end.lat, lng: routeData.waypoints.end.lon }}
                onCloseClick={() => setSelectedEnd(false)}
              >
                <div className="text-xs">
                  <strong>END</strong><br />
                  Lat: {routeData.waypoints.end.lat.toFixed(4)}<br />
                  Lon: {routeData.waypoints.end.lon.toFixed(4)}
                </div>
              </InfoWindow>
            )}

            {routeData.risk_analysis.high_risk_segments.map((segment: any, idx: number) => (
              <div key={idx}>
                <Circle
                  center={{ lat: segment.centroid.lat, lng: segment.centroid.lon }}
                  radius={100}
                  options={{
                    strokeColor: 'red',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: 'red',
                    fillOpacity: 0.35,
                  }}
                  onClick={() => setSelectedSegment(idx)}
                />

                {selectedSegment === idx && (
                  <InfoWindow
                    position={{ lat: segment.centroid.lat, lng: segment.centroid.lon }}
                    onCloseClick={() => setSelectedSegment(null)}
                  >
                    <div className="text-xs">
                      <strong>Warning #{idx + 1}</strong><br />
                      Risk: {segment.category}<br />
                      Score: {segment.risk.toFixed(3)}<br />
                      Drive carefully in this area
                    </div>
                  </InfoWindow>
                )}
              </div>
            ))}
          </>
        )}

        {/* Drains */}
        {mapData?.drains?.features && mapData.drains.features.map((feature: any, idx: number) => {
          if (feature.geometry.type === 'LineString') {
            const path = feature.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
            return (
              <Polyline
                key={`drain-${idx}`}
                path={path}
                options={{
                  strokeColor: 'blue',
                  strokeWeight: 2,
                  strokeOpacity: 0.6,
                }}
              />
            );
          }
          return null;
        })}

        {/* Parking */}
        {parkingLocations.map((location: ParkingLocation) => (
          <Marker
            key={location.id}
            position={{ lat: location.lat, lng: location.lon }}
            icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
          />
        ))}
      </GoogleMap>

    </div>
  );
}

function DraggableContainer({
  children,
  defaultX,
  defaultY,
}: {
  children: React.ReactNode;
  defaultX: number;
  defaultY: number;
}) {
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging) return;
      setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };
    const handleUp = () => setDragging(false);
    if (dragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, offset]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.drag-handle')) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
  };

  return (
    <div
      ref={ref}
      className="absolute z-[1000]"
      style={{ left: position.x, top: position.y }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
// Extract RoutePanel content as a separate component
function RoutePanelContent({ onRouteCalculated, onClearRoute }: { onRouteCalculated: (data: any) => void; onClearRoute: () => void }) {
  const [startQuery, setStartQuery] = useState('Connaught Place');
  const [endQuery, setEndQuery] = useState('India Gate');
  const [profile, setProfile] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const resolveLocation = async (query: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/geocode?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();
      if (data.length === 0) throw new Error(`Location not found: ${query}`);
      return data[0];
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleCalculateRoute = async () => {
    setLoading(true);
    setError(null);

    try {
      const startLoc = await resolveLocation(startQuery);
      const endLoc = await resolveLocation(endQuery);

      if (!startLoc) throw new Error(`Could not find start location: "${startQuery}"`);
      if (!endLoc) throw new Error(`Could not find end location: "${endQuery}"`);

      const response = await fetch(
        `${API_BASE_URL}/api/route?` +
        `start_lat=${startLoc.lat}&start_lon=${startLoc.lon}&` +
        `end_lat=${endLoc.lat}&end_lon=${endLoc.lon}&` +
        `profile=${profile}`
      );

      if (!response.ok) {
        throw new Error('Failed to calculate route');
      }

      const data = await response.json();
      setRouteInfo(data);
      onRouteCalculated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRouteInfo(null);
    onClearRoute();
  };

  const presetLocations = [
    { name: 'Preet Vihar' },
    { name: 'Mayur Vihar' },
    { name: 'Laxmi Nagar' },
    { name: 'Gandhi Nagar' },
  ];

  return (
    <div>
      {/* Quick Presets */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">Quick Locations:</label>
        <div className="flex flex-wrap gap-2">
          {presetLocations.map((loc, idx) => (
            <button
              key={idx}
              onClick={() => setStartQuery(loc.name)}
              className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Start Point */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">Start Point</label>
        <input
          type="text"
          placeholder="Enter start location (e.g. CP)"
          value={startQuery}
          onChange={(e) => setStartQuery(e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
        />
      </div>

      {/* End Point */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">End Point</label>
        <input
          type="text"
          placeholder="Enter destination"
          value={endQuery}
          onChange={(e) => setEndQuery(e.target.value)}
          className="w-full p-2 border rounded text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
        />
      </div>

      {/* Travel Mode */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">Travel Mode</label>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          className="w-full p-2 border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
        >
          <option value="driving">Driving</option>
          <option value="walking">Walking</option>
          <option value="cycling">Cycling</option>
        </select>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleCalculateRoute}
          disabled={loading}
          className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-slate-400"
        >
          {loading ? 'Calculating...' : 'Find Route'}
        </button>
        {routeInfo && (
          <button
            onClick={handleClear}
            className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 dark:bg-red-950/40 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 px-3 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Route Info */}
      {routeInfo && (
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">Route Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Distance:</span>
              <span className="font-bold">
                {routeInfo.route.properties.distance_km.toFixed(2)} km
              </span>
            </div>

            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-bold">
                {routeInfo.route.properties.duration_min.toFixed(0)} min
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Risk Level:</span>
              <span
                className="font-bold px-2 py-1 rounded text-white text-xs"
                style={{ backgroundColor: routeInfo.risk_analysis.color }}
              >
                {routeInfo.risk_analysis.risk_level}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Avg Risk Score:</span>
              <span className="font-bold">
                {routeInfo.risk_analysis.avg_risk.toFixed(3)}
              </span>
            </div>

            {routeInfo.risk_analysis.warning_count > 0 && (
              <div className="bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-400 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded mt-2">
                {routeInfo.risk_analysis.warning_count} high-risk segment(s) detected.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
        Tip: Enter location names to find the safest route.
      </div>
    </div>
  );
}
