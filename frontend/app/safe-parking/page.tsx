'use client';

import { useState } from 'react';
import { useSafeParkingAPI } from '@/lib/api';
import { MapPin, Navigation, Loader, AlertTriangle } from 'lucide-react';

interface ParkingLocation {
  name: string;
  lat: number | null;
  lon: number | null;
  risk: string | null;
  distance_m: number | null;
  final_score: number | null;
  route: { lat: number; lon: number }[];
}


export default function SafeParkingPage() {
  const safeParkingAPI = useSafeParkingAPI();
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [radius, setRadius] = useState('2000');
  const [limit, setLimit] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [lastSearch, setLastSearch] = useState<string | null>(null);

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
      const data = await safeParkingAPI.getRecommended({
        lat: latNum,
        lon: lonNum,
        radius: parseNumber(radius) ?? 2000,
        limit: parseNumber(limit) ?? 3,
      });
      setLocations(data.locations || []);
      setLastSearch(`Smart recommendation within ${radius}m`);
    } catch (err: any) {
      setError(err?.message || 'Failed to load safe parking locations');
    } finally {
      setLoading(false);
    }
  };

  // const fetchAll = async () => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const data = await safeParkingAPI.getAll();
  //     setLocations(data.locations || []);
  //     setLastSearch('All locations');
  //   } catch (err: any) {
  //     setError(err?.message || 'Failed to load safe parking locations');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latVal = Number(pos.coords.latitude.toFixed(6));
        const lonVal = Number(pos.coords.longitude.toFixed(6));
        setLat(String(latVal));
        setLon(String(lonVal));
        fetchNearby(latVal, lonVal);
      },
      () => {
        setLoading(false);
        setError('Location permission denied. Enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Nearby Safe Parking</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Find elevated or multi-level parking within a safe radius during flood conditions.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
              onClick={useMyLocation}
              disabled={loading}
            >
              Use My Location
            </button>
            {/* <button
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 font-semibold"
              onClick={fetchAll}
              disabled={loading}
            >
              Show All
            </button> */}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Latitude</label>
            <input
              className="mt-2 w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="28.6139"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Longitude</label>
            <input
              className="mt-2 w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="77.2090"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Radius (m)</label>
            <input
              className="mt-2 w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="5000"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Limit</label>
            <input
              className="mt-2 w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="4"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            className="px-5 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
            onClick={() => fetchNearby()}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" /> Searching
              </span>
            ) : (
              'Find Parking'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Results</h2>
            {lastSearch && <span className="text-sm text-slate-500 dark:text-slate-400">{lastSearch}</span>}
          </div>

          {locations.length === 0 && !loading && !error && (
            <div className="mt-6 text-slate-500 dark:text-slate-400">No locations found. Try a larger radius.</div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {loc.name || "Safe Parking"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Risk: {loc.risk ?? "Unknown"}
                    </p>
                  </div>

                  <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                    Score {loc.final_score ?? "N/A"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    {loc.distance_m ? `${loc.distance_m} m` : "Distance n/a"}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Lat {loc.lat?.toFixed(4) ?? "-"}, Lon {loc.lon?.toFixed(4) ?? "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
