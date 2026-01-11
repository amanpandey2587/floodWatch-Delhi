'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import StatsPanel from '@/components/StatsPanel';
import WardRiskPanel from '@/components/WardRiskPanel';
import RouteCalculator from '@/components/RouteCalculator';
import FeatureToggles from '@/components/FeatureToggles';
import SOSBroadcast from '@/components/SOSBroadcast';

const EnhancedMap = dynamic(() => import('@/components/EnhancedMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

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

  const activeAlerts = hotspots.filter((h) => h.risk_level === 2).length;

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">FloodWatch Delhi</h1>
        <p className="text-sm text-white/80 drop-shadow-md">Real-time Flood Risk Prediction & Management</p>
      </div>

      <div className="absolute left-4 top-24 z-10 flex flex-col gap-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        <Sidebar
          rainfallIntensity={rainfallIntensity}
          onRainfallChange={handleRainfallChange}
          loading={loading}
        />

        <RouteCalculator onRouteCalculate={calculateRoute} />

        <FeatureToggles
          showTraffic={showTraffic}
          showWards={showWards}
          showCrowdsource={showCrowdsource}
          onToggleTraffic={() => setShowTraffic(!showTraffic)}
          onToggleWards={() => setShowWards(!showWards)}
          onToggleCrowdsource={() => setShowCrowdsource(!showCrowdsource)}
        />

        {route && route.warnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-semibold text-red-800 mb-2">Route Warnings</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {route.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
            {route.distance_km && (
              <div className="mt-2 text-xs text-red-600">
                Distance: {route.distance_km} km • Duration: {route.duration_min} min
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute right-4 top-24 z-10 w-80 max-h-[calc(100vh-120px)] overflow-y-auto">
        <SOSBroadcast wards={wards.map((w) => ({ id: w.id, name: w.name }))} />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <StatsPanel activeAlerts={activeAlerts} totalHotspots={hotspots.length} />
      </div>

      <div className="absolute bottom-4 right-4 z-10">
        <WardRiskPanel rainfallIntensity={rainfallIntensity} />
      </div>

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
    </main>
  );
}
