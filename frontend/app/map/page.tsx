'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import StatsPanel from '@/components/StatsPanel';
import WardRiskPanel from '@/components/WardRiskPanel';
import MapModeToggle from '@/components/MapModeToggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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

type MapMode = 'leaflet' | 'google-standard' | 'google-3d' | 'google-streetview';
type GoogleMapMode = 'standard' | '3d' | 'streetview';

export default function MapPage() {
  const [rainfallIntensity, setRainfallIntensity] = useState(50);
  const [hotspots, setHotspots] = useState<HotspotPrediction[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [crowdsourceReports, setCrowdsourceReports] = useState<CrowdsourceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const [showWards, setShowWards] = useState(false);
  const [showCrowdsource, setShowCrowdsource] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('leaflet');

  const fetchPredictions = useCallback(async (rainfall: number) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rainfall_intensity: rainfall }),
      });
      const data = await response.json();
      setHotspots(data.hotspots || []);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWards = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/wards');
      const data = await response.json();
      setWards(data || []);
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  }, []);

  const fetchCrowdsourceReports = useCallback(async (rainfall: number) => {
    try {
      const response = await fetch(`http://localhost:8000/crowdsource?rainfall_intensity=${rainfall}`);
      const data = await response.json();
      setCrowdsourceReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching crowdsource reports:', error);
    }
  }, []);

  const calculateRoute = useCallback(async (routeData: { start: string; end: string }) => {
    try {
      const response = await fetch('http://localhost:8000/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(routeData),
      });
      const data = await response.json();
      setRoute(data);
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, []);

  useEffect(() => {
    fetchPredictions(rainfallIntensity);
    fetchWards();
  }, [rainfallIntensity, fetchPredictions, fetchWards]);

  useEffect(() => {
    if (showCrowdsource) {
      fetchCrowdsourceReports(rainfallIntensity);
      const interval = setInterval(() => {
        fetchCrowdsourceReports(rainfallIntensity);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [showCrowdsource, rainfallIntensity, fetchCrowdsourceReports]);

  const handleRainfallChange = (value: number) => {
    setRainfallIntensity(value);
  };

  const handleMapModeChange = (mode: MapMode) => {
    setMapMode(mode);
  };

  const activeAlerts = hotspots.filter((h) => h.risk_level === 2).length;

  const getGoogleMapMode = (): GoogleMapMode => {
    if (mapMode === 'google-3d') return '3d';
    if (mapMode === 'google-streetview') return 'streetview';
    return 'standard';
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden overflow-x-clip">
      {/* Map Container - z-0 (bottom layer) */}
      <div className="absolute inset-0 z-0">
        {mapMode === 'leaflet' ? (
          <EnhancedMap
            hotspots={hotspots}
            route={route}
            showTraffic={showTraffic}
            showWards={showWards}
            showCrowdsource={showCrowdsource}
            rainfallIntensity={rainfallIntensity}
            wards={wards}
            crowdsourceReports={crowdsourceReports}
          />
        ) : (
          <GoogleMapEnhanced
            hotspots={hotspots}
            route={route}
            showTraffic={showTraffic}
            showWards={showWards}
            showCrowdsource={showCrowdsource}
            rainfallIntensity={rainfallIntensity}
            wards={wards}
            crowdsourceReports={crowdsourceReports}
            mapMode={getGoogleMapMode()}
          />
        )}
      </div>

      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <h1 className="text-3xl font-bold text-slate-800 drop-shadow-lg">FloodWatch Delhi</h1>
        <p className="text-sm text-slate-800 drop-shadow-md">Real-time Flood Risk Prediction & Management</p>
      </div>

      <div className="absolute left-4 top-24 bottom-4 z-30 flex flex-col gap-4 w-[280px] pointer-events-none">
        <div className="flex flex-col gap-4 overflow-y-auto pointer-events-auto max-h-full">
          <div className="bg-white/95 dark:bg-slate-900/90 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 px-4">
            <Accordion type="multiple" defaultValue={['map-mode', 'simulation']} className="w-full">
              <AccordionItem value="map-mode" className="border-slate-200 dark:border-slate-800">
                <AccordionTrigger>Map Mode</AccordionTrigger>
                <AccordionContent>
                  <MapModeToggle currentMode={mapMode} onModeChange={handleMapModeChange} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="simulation" className="border-slate-200 dark:border-slate-800">
                <AccordionTrigger>Simulation Controls</AccordionTrigger>
                <AccordionContent>
                  <Sidebar
                    rainfallIntensity={rainfallIntensity}
                    onRainfallChange={handleRainfallChange}
                    loading={loading}
                  />
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
                          Distance: {route.distance_km} km - Duration: {route.duration_min} min
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
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 px-4 min-w-[220px]">
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
        <div className="bg-white/95 dark:bg-slate-900/90 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 px-4 min-w-[360px]">
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
