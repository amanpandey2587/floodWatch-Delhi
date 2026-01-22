'use client';

import { useState } from 'react';

interface RoutePanelProps {
  onRouteCalculated: (routeData: any) => void;
  onClearRoute: () => void;
}

export default function RoutePanel({ onRouteCalculated, onClearRoute }: RoutePanelProps) {
  const [startLat, setStartLat] = useState('28.65');
  const [startLon, setStartLon] = useState('77.25');
  const [endLat, setEndLat] = useState('28.68');
  const [endLon, setEndLon] = useState('77.30');
  const [profile, setProfile] = useState('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<any>(null);

  const handleCalculateRoute = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/route?` +
        `start_lat=${startLat}&start_lon=${startLon}&` +
        `end_lat=${endLat}&end_lon=${endLon}&` +
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
    { name: 'Preet Vihar', lat: 28.70, lon: 77.30 },
    { name: 'Mayur Vihar', lat: 28.61, lon: 77.30 },
    { name: 'Laxmi Nagar', lat: 28.64, lon: 77.28 },
    { name: 'Gandhi Nagar', lat: 28.67, lon: 77.25 },
  ];

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-lg w-80 max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4"> Route Planning</h2>

      {/* Quick Presets */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2">Quick Locations:</label>
        <select
          className="w-full p-2 border rounded text-sm"
          onChange={(e) => {
            const loc = presetLocations[parseInt(e.target.value)];
            if (loc) {
              setStartLat(loc.lat.toString());
              setStartLon(loc.lon.toString());
            }
          }}
        >
          <option value="">Select start location...</option>
          {presetLocations.map((loc, idx) => (
            <option key={idx} value={idx}>{loc.name}</option>
          ))}
        </select>
      </div>

      {/* Start Point */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2"> Start Point</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.001"
            placeholder="Latitude"
            value={startLat}
            onChange={(e) => setStartLat(e.target.value)}
            className="p-2 border rounded text-sm"
          />
          <input
            type="number"
            step="0.001"
            placeholder="Longitude"
            value={startLon}
            onChange={(e) => setStartLon(e.target.value)}
            className="p-2 border rounded text-sm"
          />
        </div>
      </div>

      {/* End Point */}
      <div className="mb-4">
        <label className="block text-sm font-bold mb-2"> End Point</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.001"
            placeholder="Latitude"
            value={endLat}
            onChange={(e) => setEndLat(e.target.value)}
            className="p-2 border rounded text-sm"
          />
          <input
            type="number"
            step="0.001"
            placeholder="Longitude"
            value={endLon}
            onChange={(e) => setEndLon(e.target.value)}
            className="p-2 border rounded text-sm"
          />
        </div>
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
          {loading ? '⏳ Calculating...' : '🔍 Find Route'}
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
                 {routeInfo.risk_analysis.warning_count} high-risk segment(s) detected!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-2">
     Tip: Click on the map to set start/end points
      </div>
    </div>
  );
}