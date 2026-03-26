'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL, useSafeParkingAPI } from '@/lib/api';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  GoogleMap, useJsApiLoader, Polyline, Marker, InfoWindow, Circle,
} from '@react-google-maps/api';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { GeoJsonLayer } from '@deck.gl/layers';
import { MVTLayer } from '@deck.gl/geo-layers';

const GOOGLE_MAPS_LIBRARIES: ('places' | 'visualization')[] = ['places', 'visualization'];
const mapContainerStyle = { width: '100%', height: '100%' };
const center = { lat: 28.67, lng: 77.30 };

const mapOptions: google.maps.MapOptions = {
  zoom: 12,
  mapTypeId: 'roadmap',
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  styles: [
    { elementType: 'geometry',         stylers: [{ saturation: -60 }] },
    { featureType: 'poi',              stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',          stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b8d4e8' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapData {
  wards: any;
  drains: any;
  stats: any;
  clusters: any;
  isolatedHotspots: any;
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

// ---------------------------------------------------------------------------
// getRiskFillColor
//
// Pure function — no closure over component state.
// Returns transparent [0,0,0,0] for cells below filterRisk threshold so that
// filtered cells disappear without touching the tile cache.
// ---------------------------------------------------------------------------
function getRiskFillColor(
  f: any,
  filterRisk: number,
): [number, number, number, number] {
  const s: number = f.properties?.risk_score ?? 0;
  if (s < filterRisk) return [0,   0,   0,   0  ]; // transparent = filtered out
  if (s > 0.7)        return [231, 76,  60,  180 ]; // red     — critical
  if (s > 0.5)        return [230, 126, 34,  180 ]; // orange  — high
  if (s > 0.3)        return [241, 196, 15,  180 ]; // yellow  — medium
  return                     [46,  204, 113, 160 ]; // green   — low
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WaterloggingMap() {
  const safeParkingAPI = useSafeParkingAPI();

  // ── React state ────────────────────────────────────────────────────────────
  const [mapData, setMapData]                   = useState<MapData | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [filterRisk, setFilterRisk]             = useState(0);
  const [routeData, setRouteData]               = useState<any>(null);
  const [selectedGrid, setSelectedGrid]         = useState<any>(null);
  const [selectedGridPos, setSelectedGridPos]   = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedRoute, setSelectedRoute]       = useState(false);
  const [selectedStart, setSelectedStart]       = useState(false);
  const [selectedEnd, setSelectedEnd]           = useState(false);
  const [selectedSegment, setSelectedSegment]   = useState<number | null>(null);
  const [parkingLat, setParkingLat]             = useState('');
  const [parkingLon, setParkingLon]             = useState('');
  const [parkingRadius, setParkingRadius]       = useState('2000');
  const [parkingLimit, setParkingLimit]         = useState('3');
  const [parkingLoading, setParkingLoading]     = useState(false);
  const [parkingError, setParkingError]         = useState<string | null>(null);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);

  // ── Stable refs ────────────────────────────────────────────────────────────
  const mapRef          = useRef<google.maps.Map | null>(null);
  // TWO separate overlays — the key fix for pan blank flash:
  // gridOverlay   → MVTLayer ONLY. setProps is NEVER called on pan/zoom.
  //                 Tile cache lives here and stays resident in GPU memory.
  // staticOverlay → wards + clusters. Updated when data loads, never on pan.
  const gridOverlay     = useRef<GoogleMapsOverlay | null>(null);
  const staticOverlay   = useRef<GoogleMapsOverlay | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Static data — stored in refs so updates don't cause re-renders
  const wardsRef    = useRef<any>(null);
  const drainsRef   = useRef<any>(null);
  const clustersRef = useRef<any>(null);

  // MVTLayer ref — THE KEY FIX:
  // We keep a single MVTLayer instance alive and clone() it for prop updates.
  // Cloning preserves the internal tile cache so panning never shows blank tiles.
  // Creating a new instance (even with the same id) wipes the cache every time.
  const mvtLayerRef = useRef<any>(null);

  // filterRisk in a ref so pushLayersToDeck (zero-dep) always reads latest value
  const filterRiskRef = useRef(filterRisk);
  useEffect(() => {
    filterRiskRef.current = filterRisk;
  }, [filterRisk]);

  // Stable click handler — same function object on every call so deck.gl
  // never sees onClick as a changed prop and skips unnecessary re-processing.
  const onClickInfoRef = useRef((props: any, coord: [number, number]) => {
    setSelectedGrid({ properties: props });
    setSelectedGridPos({ lat: coord[1], lng: coord[0] });
  });

  // ── Google Maps JS API ─────────────────────────────────────────────────────
  const { isLoaded } = useJsApiLoader({
    id:               'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries:        GOOGLE_MAPS_LIBRARIES,
    language:         'en',
    region:           'IN',
  });

  // ── Pan map to fit route whenever routeData changes ────────────────────────
  useEffect(() => {
    if (!routeData || !mapRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    routeData.route.geometry.coordinates.forEach(
      ([lon, lat]: [number, number]) => bounds.extend({ lat, lng: lon }),
    );
    bounds.extend({ lat: routeData.waypoints.start.lat, lng: routeData.waypoints.start.lon });
    bounds.extend({ lat: routeData.waypoints.end.lat,   lng: routeData.waypoints.end.lon });
    mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 360 });
  }, [routeData]);

  // ── pushLayersToDeck ───────────────────────────────────────────────────────
  //
  // Zero dependencies — everything is read via refs.
  //
  // MVTLayer lifecycle:
  //   First call  → new MVTLayer(...)     — creates tile cache from scratch
  //   Later calls → mvtLayerRef.clone()   — preserves tile cache, updates colours only
  //
  // GeoJsonLayer for wards/clusters is fine to recreate — they are small static
  // datasets that deck.gl uploads to GPU once and reuses.
  // ---------------------------------------------------------------------------
  // pushLayersToDeck — zero deps, reads everything via refs.
  //
  // Grid overlay is NEVER touched after init — only staticOverlay gets setProps.
  // For filterRisk changes we clone() the MVTLayer and call setProps on gridOverlay only.
  // Pan/zoom never calls this function at all — MVTLayer handles that internally.
  const pushLayersToDeck = useCallback((onlyStatic = false) => {

    // ── Static overlay: wards + clusters ──────────────────────────────────────
    if (staticOverlay.current) {
      staticOverlay.current.setProps({
        layers: [
          ...(wardsRef.current ? [new GeoJsonLayer({
            id:           'village-boundaries',
            data:         wardsRef.current,
            filled:       false,
            stroked:      true,
            getLineColor: [24, 95, 165, 200] as [number, number, number, number],
            getLineWidth: 40,
            pickable:     true,
            onClick: (info: any) => {
              if (info.object)
                onClickInfoRef.current(info.object.properties, info.coordinate as [number, number]);
            },
          })] : []),
          ...(clustersRef.current ? [new GeoJsonLayer({
            id:           'hotspot-clusters',
            data:         clustersRef.current,
            filled:       true,
            stroked:      true,
            getLineColor: [163, 45, 45, 220] as [number, number, number, number],
            getLineWidth: 60,
            getFillColor: (f: any) => {
              const sev = f.properties?.severity;
              if (sev === 'Critical') return [163, 45,  45,  60] as [number, number, number, number];
              if (sev === 'High')     return [133, 79,  11,  60] as [number, number, number, number];
              return                         [100, 100, 100, 40] as [number, number, number, number];
            },
            pickable: true,
            onClick: (info: any) => {
              if (info.object)
                onClickInfoRef.current(info.object.properties, info.coordinate as [number, number]);
            },
          })] : []),
        ],
      });
      console.log('[FloodWatch] Static overlay updated');
    }

    if (onlyStatic) return;

    // ── Grid overlay: MVTLayer only — clone preserves tile cache ──────────────
    if (gridOverlay.current && mvtLayerRef.current) {
      mvtLayerRef.current = mvtLayerRef.current.clone({
        getFillColor:   (f: any) => getRiskFillColor(f, filterRiskRef.current),
        updateTriggers: { getFillColor: [filterRiskRef.current] },
      });
      gridOverlay.current.setProps({ layers: [mvtLayerRef.current] });
      console.log('[FloodWatch] Grid overlay colour updated, filterRisk =', filterRiskRef.current);
    }
  }, []); // zero deps — everything read via refs

  // ── fetchStaticData — called once on map load ──────────────────────────────
  const fetchStaticData = useCallback(async () => {
    if (abortController.current) abortController.current.abort();
    abortController.current = new AbortController();
    const { signal } = abortController.current;

    try {
      setLoading(true);

      const [wardsRes, drainsRes, statsRes, clustersRes] = await Promise.all([
        wardsRef.current
          ? Promise.resolve({ json: async () => wardsRef.current })
          : fetch(`${API_BASE_URL}/api/village-boundaries`, { signal }),
        drainsRef.current
          ? Promise.resolve({ json: async () => drainsRef.current })
          : fetch(`${API_BASE_URL}/api/drains`, { signal }),
        fetch(`${API_BASE_URL}/api/stats`,    { signal }),
        clustersRef.current
          ? Promise.resolve({ json: async () => clustersRef.current })
          : fetch(`${API_BASE_URL}/api/clusters`, { signal }),
      ]);

      const [wards, drains, stats, clusters] = await Promise.all([
        wardsRes.json(),
        drainsRes.json(),
        statsRes.json(),
        clustersRes.json(),
      ]);

      wardsRef.current    = wards;
      drainsRef.current   = drains;
      clustersRef.current = clusters;

      console.log('[FloodWatch] Static data loaded — wards:', wards?.features?.length, 'clusters:', clusters?.features?.length);

      // Only update static overlay — grid overlay tile cache is untouched
      pushLayersToDeck(true);

      setMapData({ wards, drains, stats, clusters, isolatedHotspots: null });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[FloodWatch] Static data fetch error:', err);
        setError('Failed to load map data');
      }
    } finally {
      setLoading(false);
    }
  }, [pushLayersToDeck]);

  // ── handleMapLoad — both overlays created once, never recreated ───────────
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Grid overlay — interleaved renders at WebGL level, eliminates canvas
    // repositioning flash that overlay mode has on every pan frame.
    if (!gridOverlay.current) {
      mvtLayerRef.current = new MVTLayer({
        id:                 'flood-grid',
        data:               `${API_BASE_URL}/api/tiles/{z}/{x}/{y}.mvt`,
        maxCacheSize:       1024,
        refinementStrategy: 'best-available' as any,
        filled:             true,
        stroked:            false,
        getFillColor:       (f: any) => getRiskFillColor(f, filterRiskRef.current),
        updateTriggers:     { getFillColor: [filterRiskRef.current] },
        pickable:           true,
        onClick:            (info: any) => {
          if (info.object)
            onClickInfoRef.current(info.object.properties, info.coordinate as [number, number]);
        },
      });
      gridOverlay.current = new GoogleMapsOverlay({
        interleaved: true,
        layers: [mvtLayerRef.current],
      });
      gridOverlay.current.setMap(map);
      console.log('[FloodWatch] Grid overlay created (interleaved, tile cache initialized)');
    }

    // Static overlay — starts empty, populated after fetchStaticData resolves
    if (!staticOverlay.current) {
      staticOverlay.current = new GoogleMapsOverlay({ interleaved: true, layers: [] });
      staticOverlay.current.setMap(map);
      console.log('[FloodWatch] Static overlay created');
    }

    fetchStaticData();
  }, [fetchStaticData]);

  // ── Re-push on filterRisk change ───────────────────────────────────────────
  // Uses clone() internally — only colour buffer is rewritten, tile cache untouched
  useEffect(() => {
    console.log('[FloodWatch] filterRisk changed to', filterRisk, '— cloning MVTLayer');
    pushLayersToDeck();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRisk]);

  // ── Re-push when route is cleared ─────────────────────────────────────────
  useEffect(() => {
    if (!routeData) pushLayersToDeck();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortController.current?.abort();
      mvtLayerRef.current = null;
      if (gridOverlay.current)   { gridOverlay.current.setMap(null);   gridOverlay.current   = null; }
      if (staticOverlay.current) { staticOverlay.current.setMap(null); staticOverlay.current = null; }
    };
  }, []);

  // ── Parking helpers ────────────────────────────────────────────────────────
  const parseNumber = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
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
        lat:    latNum,
        lon:    lonNum,
        radius: parseNumber(parkingRadius) ?? 2000,
        limit:  parseNumber(parkingLimit)  ?? 3,
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
        lat:    latNum,
        lon:    lonNum,
        radius: Math.max(parseNumber(parkingRadius) ?? 2000, 10000),
        limit:  Math.max(parseNumber(parkingLimit)  ?? 3, 50),
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
      setParkingError('Geolocation not supported.');
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
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // ── Early returns ──────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-xl font-semibold text-slate-700 dark:text-slate-200">
          Loading Google Maps...
        </div>
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-screen w-full">

      {loading && (
        <div className="absolute top-4 right-4 z-[1001] bg-white/90 dark:bg-slate-900/90
                        px-3 py-1.5 rounded-full text-xs font-medium text-slate-600
                        dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Updating...
        </div>
      )}

      <DraggableContainer defaultX={16} defaultY={16}>
        <div className="w-[320px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg
                        border border-slate-200 dark:border-slate-800
                        bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100
                        shadow-lg backdrop-blur">
          <div className="drag-handle px-4 pt-3 pb-2 text-sm font-semibold
                          cursor-move select-none border-b border-slate-100 dark:border-slate-800">
            Map Controls
          </div>

          <Accordion type="multiple" defaultValue={['risk', 'route']} className="px-4">

            {mapData?.stats && (
              <AccordionItem value="risk">
                <AccordionTrigger>Risk Stats</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Cells</span>
                      <span className="font-medium">{mapData.stats.total_cells}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Risk</span>
                      <span className="font-medium">{mapData.stats.avg_risk.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">High Risk</span>
                      <span className="font-medium text-orange-600">{mapData.stats.high_risk_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Critical</span>
                      <span className="font-medium text-red-600">{mapData.stats.critical_count}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-slate-500 mb-1">Distribution</div>
                      {Object.entries(mapData.stats.risk_distribution).map(
                        ([category, count]: [string, any]) => (
                          <div key={category} className="flex justify-between ml-2">
                            <span>{category}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="filter">
              <AccordionTrigger>Filter by Risk</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'All',      value: 0,   active: 'bg-blue-500'   },
                    { label: 'Medium+',  value: 0.3, active: 'bg-yellow-500' },
                    { label: 'High+',    value: 0.5, active: 'bg-orange-500' },
                    { label: 'Critical', value: 0.7, active: 'bg-red-500'    },
                  ].map(btn => (
                    <button
                      key={btn.value}
                      onClick={() => setFilterRisk(btn.value)}
                      className={`px-3 py-2 rounded text-xs font-semibold text-white transition-colors
                        ${filterRisk === btn.value
                          ? btn.active
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="parking">
              <AccordionTrigger>Safe Parking Nearby</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={useMyLocation} disabled={parkingLoading}
                      className="flex-1 px-3 py-1.5 rounded bg-blue-600 text-white
                                 text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                      Use My Location
                    </button>
                    <button onClick={fetchAllParking} disabled={parkingLoading}
                      className="flex-1 px-3 py-1.5 rounded bg-emerald-600 text-white
                                 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                      Show All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { placeholder: 'Latitude',   value: parkingLat,    setter: setParkingLat    },
                      { placeholder: 'Longitude',  value: parkingLon,    setter: setParkingLon    },
                      { placeholder: 'Radius (m)', value: parkingRadius, setter: setParkingRadius },
                      { placeholder: 'Limit',      value: parkingLimit,  setter: setParkingLimit  },
                    ].map(field => (
                      <input
                        key={field.placeholder}
                        type="number"
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={e => field.setter(e.target.value)}
                        className="px-2 py-1 border rounded text-xs bg-white dark:bg-slate-900
                                   border-slate-300 dark:border-slate-700"
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => fetchNearbyParking()}
                    disabled={parkingLoading}
                    className="w-full px-3 py-1.5 rounded bg-slate-900 text-white text-xs
                               font-semibold hover:bg-slate-800 dark:bg-white dark:text-slate-900
                               disabled:opacity-50"
                  >
                    {parkingLoading ? 'Searching...' : 'Find Parking'}
                  </button>
                  {parkingError && (
                    <div className="text-red-600 text-xs">{parkingError}</div>
                  )}
                  {parkingLocations.length === 0 && !parkingLoading && !parkingError && (
                    <div className="text-slate-500 text-xs text-center py-2">No locations found.</div>
                  )}
                  {parkingLocations.map(loc => (
                    <div key={loc.id} className="p-2 border rounded text-xs bg-slate-50 dark:bg-slate-800">
                      <div className="font-semibold">{loc.name}</div>
                      <div className="text-slate-600 dark:text-slate-400">{loc.address}</div>
                      <div className="text-slate-500 mt-1">
                        Ward {loc.ward_number} · {loc.distance_km ?? 'n/a'} km · Elev {loc.elevation_m} m
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="route">
              <AccordionTrigger>Route Planning</AccordionTrigger>
              <AccordionContent>
                <RoutePanelContent
                  onRouteCalculated={setRouteData}
                  onClearRoute={() => setRouteData(null)}
                />
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>
      </DraggableContainer>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        options={mapOptions}
        onLoad={handleMapLoad}
      >
        {/* Grid cell / cluster / boundary info window */}
        {selectedGrid && selectedGridPos && (
          <InfoWindow
            position={selectedGridPos}
            onCloseClick={() => { setSelectedGrid(null); setSelectedGridPos(null); }}
          >
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: '#1e293b', minWidth: 160, lineHeight: 1.6 }}>
              {selectedGrid.properties.VILLAGE && !selectedGrid.properties.cell_id && (
                <>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{selectedGrid.properties.VILLAGE}</div>
                  <div style={{ color: '#475569' }}>Tehsil: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.TEHSIL || '—'}</span></div>
                  <div style={{ color: '#475569' }}>District: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.DISTRICT || '—'}</span></div>
                </>
              )}
              {selectedGrid.properties.severity && (
                <>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>Cluster #{selectedGrid.properties.cluster_id}</div>
                  <div style={{ color: '#475569' }}>Severity: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.severity}</span></div>
                  <div style={{ color: '#475569' }}>Avg risk: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.avg_risk?.toFixed(3)}</span></div>
                  <div style={{ color: '#475569' }}>Cells: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.cell_count}</span></div>
                  <div style={{ color: '#475569' }}>Villages: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.villages || '—'}</span></div>
                </>
              )}
              {selectedGrid.properties.cell_id && (
                <>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>Cell #{selectedGrid.properties.cell_id}</div>
                  <div style={{ color: '#475569' }}>Risk: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.risk_category || 'Unknown'}</span></div>
                  <div style={{ color: '#475569' }}>Score:
                    <span style={{
                      fontWeight: 600,
                      marginLeft: 4,
                      padding: '1px 6px',
                      borderRadius: 4,
                      color: '#fff',
                      backgroundColor:
                        (selectedGrid.properties.risk_score ?? 0) > 0.7 ? '#e74c3c' :
                        (selectedGrid.properties.risk_score ?? 0) > 0.5 ? '#e67e22' :
                        (selectedGrid.properties.risk_score ?? 0) > 0.3 ? '#f1c40f' : '#2ecc71',
                    }}>
                      {selectedGrid.properties.risk_score?.toFixed(3) || 'N/A'}
                    </span>
                  </div>
                  <div style={{ color: '#475569' }}>Village: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.village || '—'}</span></div>
                  <div style={{ color: '#475569' }}>Elevation: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.elevation_m?.toFixed(1) || 'N/A'} m</span></div>
                  <div style={{ color: '#475569' }}>Rainfall: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.rainfall_24h_mm?.toFixed(1) || 'N/A'} mm</span></div>
                  <div style={{ color: '#475569' }}>Drain dist: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedGrid.properties.drain_distance_m?.toFixed(0) || 'N/A'} m</span></div>
                </>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Route overlay */}
        {routeData && (
          <>
            <Polyline
              path={routeData.route.geometry.coordinates.map(
                ([lon, lat]: [number, number]) => ({ lat, lng: lon }),
              )}
              options={{
                strokeColor:   routeData.risk_analysis.color,
                strokeWeight:  6,
                strokeOpacity: 0.85,
              }}
              onClick={() => setSelectedRoute(true)}
            />

            {selectedRoute && (
              <InfoWindow
                position={{
                  lat: routeData.route.geometry.coordinates[0][1],
                  lng: routeData.route.geometry.coordinates[0][0],
                }}
                onCloseClick={() => setSelectedRoute(false)}
              >
                <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: '#1e293b', minWidth: 140, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>Route Details</div>
                  <div style={{ color: '#475569' }}>Distance: <span style={{ fontWeight: 600, color: '#1e293b' }}>{routeData.route.properties.distance_km.toFixed(2)} km</span></div>
                  <div style={{ color: '#475569' }}>Duration: <span style={{ fontWeight: 600, color: '#1e293b' }}>{routeData.route.properties.duration_min.toFixed(0)} min</span></div>
                  <div style={{ color: '#475569' }}>Risk: <span style={{ fontWeight: 600, padding: '1px 6px', borderRadius: 4, color: '#fff', backgroundColor: routeData.risk_analysis.color }}>{routeData.risk_analysis.risk_level}</span></div>
                </div>
              </InfoWindow>
            )}

            <Marker
              position={{ lat: routeData.waypoints.start.lat, lng: routeData.waypoints.start.lon }}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
              onClick={() => setSelectedStart(true)}
            />
            {selectedStart && (
              <InfoWindow
                position={{ lat: routeData.waypoints.start.lat, lng: routeData.waypoints.start.lon }}
                onCloseClick={() => setSelectedStart(false)}
              >
                <div style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>▶ START</div>
              </InfoWindow>
            )}

            <Marker
              position={{ lat: routeData.waypoints.end.lat, lng: routeData.waypoints.end.lon }}
              icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }}
              onClick={() => setSelectedEnd(true)}
            />
            {selectedEnd && (
              <InfoWindow
                position={{ lat: routeData.waypoints.end.lat, lng: routeData.waypoints.end.lon }}
                onCloseClick={() => setSelectedEnd(false)}
              >
                <div style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>⬛ END</div>
              </InfoWindow>
            )}

            {routeData.risk_analysis.high_risk_segments.map((segment: any, idx: number) => (
              <Circle
                key={idx}
                center={{ lat: segment.lat, lng: segment.lon }}
                radius={100}
                options={{
                  strokeColor:   '#e74c3c',
                  strokeOpacity: 0.8,
                  strokeWeight:  2,
                  fillColor:     '#e74c3c',
                  fillOpacity:   0.3,
                }}
                onClick={() => setSelectedSegment(idx === selectedSegment ? null : idx)}
              />
            ))}

            {selectedSegment !== null &&
              routeData.risk_analysis.high_risk_segments[selectedSegment] && (
              <InfoWindow
                position={{
                  lat: routeData.risk_analysis.high_risk_segments[selectedSegment].lat,
                  lng: routeData.risk_analysis.high_risk_segments[selectedSegment].lon,
                }}
                onCloseClick={() => setSelectedSegment(null)}
              >
                <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: '#1e293b', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: '#dc2626' }}>⚠ Warning #{selectedSegment + 1}</div>
                  <div style={{ color: '#475569' }}>Risk: <span style={{ fontWeight: 600, color: '#1e293b' }}>{routeData.risk_analysis.high_risk_segments[selectedSegment].category}</span></div>
                  <div style={{ color: '#475569' }}>Score: <span style={{ fontWeight: 600, color: '#1e293b' }}>{routeData.risk_analysis.high_risk_segments[selectedSegment].risk?.toFixed(3)}</span></div>
                </div>
              </InfoWindow>
            )}
          </>
        )}

        {/* Drain polylines */}
        {mapData?.drains?.features?.map((feature: any, idx: number) => {
          if (feature.geometry.type !== 'LineString') return null;
          const path = feature.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ lat, lng }),
          );
          return (
            <Polyline
              key={`drain-${idx}`}
              path={path}
              options={{ strokeColor: '#3b82f6', strokeWeight: 1.5, strokeOpacity: 0.5 }}
            />
          );
        })}

        {/* Safe parking markers */}
        {parkingLocations.map(loc => (
          <Marker
            key={loc.id}
            position={{ lat: loc.lat, lng: loc.lon }}
            icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
            title={loc.name}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DraggableContainer
// ---------------------------------------------------------------------------

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
  const [offset, setOffset]     = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging) return;
      setPosition({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };
    const handleUp = () => setDragging(false);
    if (dragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup',   handleUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup',   handleUp);
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

// ---------------------------------------------------------------------------
// RoutePanelContent
// ---------------------------------------------------------------------------

function RoutePanelContent({
  onRouteCalculated,
  onClearRoute,
}: {
  onRouteCalculated: (data: any) => void;
  onClearRoute: () => void;
}) {
  const [startQuery, setStartQuery] = useState('Connaught Place');
  const [endQuery, setEndQuery]     = useState('India Gate');
  const [profile, setProfile]       = useState('driving');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [routeInfo, setRouteInfo]   = useState<any>(null);

  const resolveLocation = async (query: string) => {
    const res  = await fetch(`${API_BASE_URL}/api/geocode?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (!data.length) throw new Error(`Location not found: "${query}"`);
    return data[0];
  };

  const handleCalculateRoute = async () => {
    setLoading(true);
    setError(null);
    try {
      const [startLoc, endLoc] = await Promise.all([
        resolveLocation(startQuery),
        resolveLocation(endQuery),
      ]);
      const res = await fetch(
        `${API_BASE_URL}/api/route?` +
        `start_lat=${startLoc.lat}&start_lon=${startLoc.lon}&` +
        `end_lat=${endLoc.lat}&end_lon=${endLoc.lon}&profile=${profile}`,
      );
      if (!res.ok) throw new Error('Failed to calculate route');
      const data = await res.json();
      setRouteInfo(data);
      onRouteCalculated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setRouteInfo(null); onClearRoute(); };
  const presets = ['Preet Vihar', 'Mayur Vihar', 'Laxmi Nagar', 'Gandhi Nagar'];

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-slate-500 mb-1.5">Quick locations</div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(name => (
            <button
              key={name}
              onClick={() => setStartQuery(name)}
              className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40
                         text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Start</label>
        <input
          type="text"
          value={startQuery}
          onChange={e => setStartQuery(e.target.value)}
          placeholder="e.g. Connaught Place"
          className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900
                     border-slate-300 dark:border-slate-700"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 text-slate-600 dark:text-slate-400">Destination</label>
        <input
          type="text"
          value={endQuery}
          onChange={e => setEndQuery(e.target.value)}
          placeholder="e.g. India Gate"
          className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900
                     border-slate-300 dark:border-slate-700"
        />
      </div>

      <select
        value={profile}
        onChange={e => setProfile(e.target.value)}
        className="w-full px-2 py-1.5 border rounded text-sm bg-white dark:bg-slate-900
                   border-slate-300 dark:border-slate-700"
      >
        <option value="driving">Driving</option>
        <option value="walking">Walking</option>
        <option value="cycling">Cycling</option>
      </select>

      <div className="flex gap-2">
        <button
          onClick={handleCalculateRoute}
          disabled={loading}
          className="flex-1 bg-blue-500 text-white py-1.5 rounded text-sm font-medium
                     hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Calculating...' : 'Find Route'}
        </button>
        {routeInfo && (
          <button
            onClick={handleClear}
            className="bg-red-500 text-white px-3 py-1.5 rounded text-sm font-medium
                       hover:bg-red-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30
                        border border-red-200 dark:border-red-900 rounded px-3 py-2">
          {error}
        </div>
      )}

      {routeInfo && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 text-xs">
          <div className="font-medium mb-2">Route Summary</div>
          <div className="flex justify-between">
            <span className="text-slate-500">Distance</span>
            <span className="font-medium">{routeInfo.route.properties.distance_km.toFixed(2)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Duration</span>
            <span className="font-medium">{routeInfo.route.properties.duration_min.toFixed(0)} min</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Risk</span>
            <span
              className="font-medium px-2 py-0.5 rounded text-white text-xs"
              style={{ backgroundColor: routeInfo.risk_analysis.color }}
            >
              {routeInfo.risk_analysis.risk_level}
            </span>
          </div>
          {routeInfo.risk_analysis.warning_count > 0 && (
            <div className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30
                            border border-amber-200 dark:border-amber-900 rounded px-2 py-1.5 mt-1">
              {routeInfo.risk_analysis.warning_count} high-risk segment
              {routeInfo.risk_analysis.warning_count > 1 ? 's' : ''} on this route
            </div>
          )}
        </div>
      )}
    </div>
  );
}