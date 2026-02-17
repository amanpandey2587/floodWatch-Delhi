'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { API_BASE_URL } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);

interface MapData {
  grid: any;
  wards: any;
  drains: any;
  stats: any;
}

// Color based on risk score
const getRiskColor = (riskScore: number): string => {
  if (riskScore > 0.7) return '#e74c3c'; // Critical - Red
  if (riskScore > 0.5) return '#e67e22'; // High - Orange
  if (riskScore > 0.3) return '#f1c40f'; // Medium - Yellow
  return '#2ecc71'; // Low - Green
};

// Style function for grid cells
const gridStyle = (feature: any) => {
  const riskScore = feature.properties.risk_score || 0;
  
  return {
    fillColor: getRiskColor(riskScore),
    fillOpacity: 0.7,
    color: 'white',
    weight: 0.5,
    opacity: 1
  };
};

// Style for ward boundaries
const wardStyle = {
  fillColor: 'transparent',
  fillOpacity: 0,
  color: '#2c3e50',
  weight: 2,
  opacity: 0.8
};

export default function WaterloggingMap() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
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

  // Popup content for grid cells
  const onEachGridFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const props = feature.properties;
      
      const popupContent = `
        <div style="font-family: Arial; padding: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #2c3e50;">Cell #${props.cell_id || 'N/A'}</h3>
          <table style="width: 100%; font-size: 12px;">
            <tr>
              <td><strong>Risk:</strong></td>
              <td><span style="color: ${getRiskColor(props.risk_score)}; font-weight: bold;">
                ${props.risk_category || 'Unknown'}
              </span></td>
            </tr>
            <tr>
              <td><strong>Score:</strong></td>
              <td>${props.risk_score?.toFixed(3) || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Elevation:</strong></td>
              <td>${props.elevation_m?.toFixed(1) || 'N/A'} m</td>
            </tr>
            <tr>
              <td><strong>Rainfall:</strong></td>
              <td>${props.rainfall_24h_mm?.toFixed(1) || 'N/A'} mm</td>
            </tr>
            <tr>
              <td><strong>Drain Dist:</strong></td>
              <td>${props.drain_distance_m?.toFixed(0) || 'N/A'} m</td>
            </tr>
          </table>
        </div>
      `;
      
      layer.bindPopup(popupContent);
    }
  };

  // Popup for wards
  const onEachWardFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const props = feature.properties;
      
      const popupContent = `
        <div style="font-family: Arial; padding: 8px;">
          <h3 style="margin: 0 0 8px 0;">${props.ward_name || 'Unknown Ward'}</h3>
          <p><strong>Avg Risk:</strong> ${props.avg_risk?.toFixed(3) || 'N/A'}</p>
          <p><strong>High-risk Cells:</strong> ${props.high_risk_cells || 0}</p>
          <p><strong>Total Cells:</strong> ${props.n_cells || 0}</p>
        </div>
      `;
      
      layer.bindPopup(popupContent);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center text-red-500">
          <p className="text-xl font-bold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Stats Panel */}
      {mapData?.stats && (
        <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-slate-900 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold mb-2">East Delhi Risk Stats</h2>
          <div className="text-sm space-y-1">
            <p><strong>Total Cells:</strong> {mapData.stats.total_cells}</p>
            <p><strong>Avg Risk:</strong> {mapData.stats.avg_risk.toFixed(3)}</p>
            <p><strong>High Risk:</strong> {mapData.stats.high_risk_count}</p>
            <p><strong>Critical:</strong> {mapData.stats.critical_count}</p>
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold text-sm mb-2">Distribution:</h3>
            {Object.entries(mapData.stats.risk_distribution).map(([category, count]: [string, any]) => (
              <div key={category} className="flex justify-between text-xs">
                <span>{category}:</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Controls */}
        <div className="absolute top-4 right-4 z-[1000] bg-white dark:bg-slate-900 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold mb-2">Filter by Risk</h3>
        <div className="space-y-2">
          <button
            onClick={() => setFilterRisk(0)}
            className={`w-full px-3 py-1 rounded ${filterRisk === 0 ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterRisk(0.3)}
            className={`w-full px-3 py-1 rounded ${filterRisk === 0.3 ? 'bg-yellow-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
          >
            Medium+
          </button>
          <button
            onClick={() => setFilterRisk(0.5)}
            className={`w-full px-3 py-1 rounded ${filterRisk === 0.5 ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
          >
            High+
          </button>
          <button
            onClick={() => setFilterRisk(0.7)}
            className={`w-full px-3 py-1 rounded ${filterRisk === 0.7 ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
          >
            Critical
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 right-4 z-[1000] bg-white dark:bg-slate-900 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-sm mb-2">Risk Level</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#2ecc71] mr-2"></div>
            <span>Low (0.0 - 0.3)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#f1c40f] mr-2"></div>
            <span>Medium (0.3 - 0.5)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#e67e22] mr-2"></div>
            <span>High (0.5 - 0.7)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[#e74c3c] mr-2"></div>
            <span>Critical (0.7 - 1.0)</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[28.65, 77.28]}
        zoom={13}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Grid Layer */}
        {mapData?.grid && (
          <GeoJSON
            data={mapData.grid}
            style={gridStyle}
            onEachFeature={onEachGridFeature}
          />
        )}

        {/* Ward Boundaries */}
        {mapData?.wards && (
          <GeoJSON
            data={mapData.wards}
            style={wardStyle}
            onEachFeature={onEachWardFeature}
          />
        )}

        {/* Drainage Network */}
        {mapData?.drains && mapData.drains.features?.length > 0 && (
          <GeoJSON
            data={mapData.drains}
            style={{ color: '#3498db', weight: 2, opacity: 0.6 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
