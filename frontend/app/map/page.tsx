'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import StatsPanel from '@/components/StatsPanel';
import WardRiskPanel from '@/components/WardRiskPanel';
import MapModeToggle from '@/components/MapModeToggle';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

const EnhancedMap = dynamic(() => import('@/components/EnhancedMap'), {
  ssr: false,
  loading: () => <MapLoadingSpinner />,
});

const GoogleMapEnhanced = dynamic(() => import('@/components/GoogleMapEnhanced'), {
  ssr: false,
  loading: () => <MapLoadingSpinner />,
});

function MapLoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-slate-600 dark:text-slate-300">Loading map...</p>
      </div>
    </div>
  );
}

interface HotspotPrediction {
  id: number;
  name: string;
  lat: number;
  lng: number;
  risk_level: number;
  probability: number;
}

interface Route {
  route: Array<[number, number]>;
  warnings: string[];
  distance_km: number;
  duration_min: number;
}

interface Ward {
  id: string;
  name: string;
  bounds: Array<[number, number]>;
  preparedness_score: number;
  pumps_available: number;
  pumps_total: number;
  drains_desilted: boolean;
  emergency_contacts: number;
}

interface CrowdsourceReport {
  id: string;
  lat: number;
  lng: number;
  message: string;
  timestamp: number;
  severity: number;
}

interface VillagePreparedness {
  type: string;
  features: Array<{
    type: string;
    properties: {
      VILLAGE: string;
      TEHSIL: string;
      DISTRICT: string;
      PREP_SCORE: number;
      PREP_LEVEL: string;
      PREP_COLOR: string;
      DESILTING_PCT: number;
      AVG_RISK: number;
      HIGH_RISK_CELLS: number;
      TOTAL_CELLS: number;
      ACTIONS: string;
    };
    geometry: any;
  }>;
  metadata?: { total: number; level_filter: string | null };
}

type MapMode = 'leaflet' | 'google-standard' | 'google-3d' | 'google-streetview';
type GoogleMapMode = 'standard' | '3d' | 'streetview';

const PREP_LEVELS = [
  { level: 'Prepared',     color: '#2ecc71' },
  { level: 'Moderate gap', color: '#f1c40f' },
  { level: 'High gap',     color: '#e67e22' },
  { level: 'Critical gap', color: '#e74c3c' },
];

export default function MapPage() {
  const [rainfallIntensity, setRainfallIntensity]     = useState(50);
  const [hotspots, setHotspots]                       = useState<HotspotPrediction[]>([]);
  const [route, setRoute]                             = useState<Route | null>(null);
  const [wards, setWards]                             = useState<Ward[]>([]);
  const [crowdsourceReports, setCrowdsourceReports]   = useState<CrowdsourceReport[]>([]);
  const [loading, setLoading]                         = useState(false);
  const [showTraffic, setShowTraffic]                 = useState(false);
  const [showWards, setShowWards]                     = useState(false);
  const [showCrowdsource, setShowCrowdsource]         = useState(false);
  const [mapMode, setMapMode]                         = useState<MapMode>('leaflet');
  const [villagePreparedness, setVillagePreparedness] = useState<VillagePreparedness | null>(null);
  const [showPreparedness, setShowPreparedness]       = useState(true);
  const [prepFilter, setPrepFilter]                   = useState<string | null>(null);
  const [prepLoading, setPrepLoading]                 = useState(false);

  const fetchPredictions = useCallback(async (rainfall: number) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rainfall_intensity: rainfall }),
      });
      const data = await res.json();
      setHotspots(data.hotspots || []);
    } catch (e) {
      console.error('Predictions error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWards = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE_URL}/wards`);
      const data = await res.json();
      setWards(data || []);
    } catch (e) {
      console.error('Wards error:', e);
    }
  }, []);

  const fetchCrowdsourceReports = useCallback(async (rainfall: number) => {
    try {
      const res  = await fetch(`${API_BASE_URL}/crowdsource?rainfall_intensity=${rainfall}`);
      const data = await res.json();
      setCrowdsourceReports(data.reports || []);
    } catch (e) {
      console.error('Crowdsource error:', e);
    }
  }, []);

  const fetchVillagePreparedness = useCallback(async (level: string | null = null) => {
    setPrepLoading(true);
    try {
      const url = level
        ? `${API_BASE_URL}/api/village-preparedness?level=${encodeURIComponent(level)}`
        : `${API_BASE_URL}/api/village-preparedness`;
      const res  = await fetch(url);
      const data = await res.json();
      console.log("Url is ",url);
      console.log("Data in the fronted side is",data);
      setVillagePreparedness(data);
    } catch (e) {
      console.error('Village preparedness error:', e);
    } finally {
      setPrepLoading(false);
    }
  }, []);

  // On mount: fetch everything once
  useEffect(() => {
    fetchPredictions(rainfallIntensity);
    fetchWards();
    fetchVillagePreparedness(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch predictions when rainfall slider changes
  useEffect(() => {
    fetchPredictions(rainfallIntensity);
  }, [rainfallIntensity, fetchPredictions]);

  // Poll crowdsource reports while layer is enabled
  useEffect(() => {
    if (!showCrowdsource) return;
    fetchCrowdsourceReports(rainfallIntensity);
    const interval = setInterval(
      () => fetchCrowdsourceReports(rainfallIntensity), 30_000
    );
    return () => clearInterval(interval);
  }, [showCrowdsource, rainfallIntensity, fetchCrowdsourceReports]);

  // Re-fetch preparedness when level filter changes
  useEffect(() => {
    fetchVillagePreparedness(prepFilter);
  }, [prepFilter, fetchVillagePreparedness]);

  const activeAlerts    = hotspots.filter(h => h.risk_level === 2).length;
  const getGoogleMapMode = (): GoogleMapMode =>
    mapMode === 'google-3d' ? '3d' : mapMode === 'google-streetview' ? 'streetview' : 'standard';

  const prepCounts = PREP_LEVELS.reduce((acc, { level }) => {
  acc[level] = (villagePreparedness?.features ?? []).filter(
    f => f.properties.PREP_LEVEL === level
  ).length;
  return acc;
}, {} as Record<string, number>);

  const sharedMapProps = {
    hotspots,
    route,
    showTraffic,
    showWards,
    showCrowdsource,
    rainfallIntensity,
    wards,
    crowdsourceReports,
    villagePreparedness: showPreparedness ? villagePreparedness : null,
     prepFilter, 
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden overflow-x-clip">

      <div className="absolute inset-0 z-0">
        {mapMode === 'leaflet' ? (
          <EnhancedMap {...sharedMapProps} />
        ) : (
          <GoogleMapEnhanced {...sharedMapProps} mapMode={getGoogleMapMode()} />
        )}
      </div>

      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <h1 className="text-3xl font-bold text-slate-800 drop-shadow-lg">FloodWatch Delhi</h1>
        <p className="text-sm text-slate-800 drop-shadow-md">
          Real-time Flood Risk Prediction & Management
        </p>
      </div>

      <div className="absolute left-4 top-24 bottom-4 z-30 flex flex-col gap-4 w-[280px] pointer-events-none">
        <div className="flex flex-col gap-4 overflow-y-auto pointer-events-auto max-h-full">
          <div className="bg-white/95 dark:bg-slate-900/90 rounded-lg shadow-xl
                          border border-slate-200 dark:border-slate-800 px-4">
            <Accordion type="multiple" defaultValue={['map-mode', 'simulation', 'preparedness']}>

              <AccordionItem value="map-mode" className="border-slate-200 dark:border-slate-800">
                <AccordionTrigger>Map Mode</AccordionTrigger>
                <AccordionContent>
                  <MapModeToggle currentMode={mapMode} onModeChange={setMapMode} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="simulation" className="border-slate-200 dark:border-slate-800">
                <AccordionTrigger>Simulation Controls</AccordionTrigger>
                <AccordionContent>
                  <Sidebar
                    rainfallIntensity={rainfallIntensity}
                    onRainfallChange={setRainfallIntensity}
                    loading={loading}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="preparedness" className="border-slate-200 dark:border-slate-800">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    Village Preparedness
                    {prepLoading && (
                      <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent
                                       rounded-full animate-spin inline-block" />
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-xs">

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        className={`w-8 h-4 rounded-full transition-colors relative
                          ${showPreparedness ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        onClick={() => setShowPreparedness(p => !p)}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full
                                         shadow transition-transform
                                         ${showPreparedness ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-slate-600 dark:text-slate-300">Show on map</span>
                    </label>

                    <div className="grid grid-cols-2 gap-1.5">
                      {PREP_LEVELS.map(({ level, color }) => (
                        <button
                          key={level}
                          onClick={() => setPrepFilter(f => f === level ? null : level)}
                          className="flex justify-between items-center px-2 py-1.5
                                     rounded border text-left transition-opacity"
                          style={{
                            borderColor:     color + '80',
                            backgroundColor: color + (prepFilter === level ? '30' : '12'),
                            opacity: prepFilter && prepFilter !== level ? 0.45 : 1,
                          }}
                        >
                          <span style={{ color }} className="font-medium leading-tight">
                            {level}
                          </span>
                          <span style={{ color }} className="font-bold text-sm">
                            {prepCounts[level] ?? 0}
                          </span>
                        </button>
                      ))}
                    </div>

                    {prepFilter && (
                      <button
                        onClick={() => setPrepFilter(null)}
                        className="w-full text-xs text-slate-500 hover:text-slate-700
                                   dark:hover:text-slate-300 underline text-center"
                      >
                        Clear filter — show all villages
                      </button>
                    )}

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-slate-400 mb-1">Score based on:</p>
                      {[
                        ['35%', 'Terrain vulnerability'],
                        ['20%', 'Rainfall exposure'],
                        ['20%', 'Drain infrastructure'],
                        ['15%', 'Slope risk'],
                      ].map(([pct, label]) => (
                        <div key={label} className="flex justify-between text-slate-500">
                          <span>{label}</span>
                          <span className="font-medium">{pct}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-slate-400">
                      Click any village on the map for details and action items.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {route && route.warnings.length > 0 && (
                <AccordionItem value="warnings" className="border-slate-200 dark:border-slate-800">
                  <AccordionTrigger>Route Warnings</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
                      <h4 className="font-semibold text-red-800 mb-2">Route Warnings</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {route.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                      {route.distance_km && (
                        <div className="mt-2 text-xs text-red-600 pt-2 border-t border-red-200">
                          Distance: {route.distance_km} km · Duration: {route.duration_min} min
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

            </Accordion>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-40 pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-lg shadow-xl
                        border border-slate-200 dark:border-slate-800 px-4 min-w-[220px]">
          <Accordion type="single" collapsible defaultValue="alerts">
            <AccordionItem value="alerts" className="border-slate-200 dark:border-slate-800">
              <AccordionTrigger>Alerts</AccordionTrigger>
              <AccordionContent>
                <StatsPanel activeAlerts={activeAlerts} totalHotspots={hotspots.length} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <div className="absolute top-14 right-4 z-30 pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-lg shadow-xl
                        border border-slate-200 dark:border-slate-800 px-4 min-w-[360px]">
          <Accordion type="single" collapsible defaultValue="ward-risk">
            <AccordionItem value="ward-risk" className="border-slate-200 dark:border-slate-800">
              <AccordionTrigger>Ward Risk</AccordionTrigger>
              <AccordionContent>
                <WardRiskPanel rainfallIntensity={rainfallIntensity} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

    </main>
  );
}