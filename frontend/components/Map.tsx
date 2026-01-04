'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface HotspotPrediction {
  id: number
  name: string
  lat: number
  lng: number
  risk_level: number
  probability: number
}

interface MapProps {
  hotspots: HotspotPrediction[]
}

const createIcon = (color: string) => {
  return divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: pointer;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

const safeIcon = createIcon('#10b981')
const warningIcon = createIcon('#f59e0b')
const criticalIcon = createIcon('#ef4444')

export default function MapComponent({ hotspots }: MapProps) {
  const getIcon = (riskLevel: number) => {
    switch (riskLevel) {
      case 0:
        return safeIcon
      case 1:
        return warningIcon
      case 2:
        return criticalIcon
      default:
        return safeIcon
    }
  }

  const getRiskLabel = (riskLevel: number) => {
    switch (riskLevel) {
      case 0:
        return 'Safe'
      case 1:
        return 'Warning'
      case 2:
        return 'Critical'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {hotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            position={[hotspot.lat, hotspot.lng]}
            icon={getIcon(hotspot.risk_level)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-1">{hotspot.name}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Level:</span>
                    <span
                      className={`font-semibold ${
                        hotspot.risk_level === 0
                          ? 'text-green-600'
                          : hotspot.risk_level === 1
                          ? 'text-orange-600'
                          : 'text-red-600'
                      }`}
                    >
                      {getRiskLabel(hotspot.risk_level)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Probability:</span>
                    <span className="font-semibold">
                      {(hotspot.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
