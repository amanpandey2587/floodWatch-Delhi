'use client';

import { useState } from 'react';

interface RoutePanelProps {
  onRouteCalculated: (routeData: any) => void;
  onClearRoute: () => void;
}

export default function RoutePanel({ onRouteCalculated, onClearRoute }: RoutePanelProps) {
  const [startQuery, setStartQuery] = useState('Connaught Place');
  const [endQuery, setEndQuery] = useState('India Gate');
  const [profile, setProfile] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const resolveLocation = async (query: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/geocode?query=${encodeURIComponent(query)}`);
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
        `http://localhost:8000/api/route?` +
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
              className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-200"
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
          className="w-full p-2 border rounded text-sm"
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
          className="w-full p-2 border rounded text-sm"
        />
      </div>

      {/* Travel Mode */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">Travel Mode</label>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          className="w-full p-2 border rounded"
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
          className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
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
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded mt-2">
                {routeInfo.risk_analysis.warning_count} high-risk segment(s) detected.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-2">
        Tip: Enter location names to find the safest route.
      </div>
    </div>
  );
}
