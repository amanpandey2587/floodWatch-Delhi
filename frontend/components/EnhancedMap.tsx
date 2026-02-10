'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet'
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

interface Route {
  route: Array<[number, number]>
  warnings: string[]
  distance_km: number
  duration_min: number
}

interface Ward {
  id: string
  name: string
  bounds: Array<[number, number]>
  preparedness_score: number
  pumps_available: number
  pumps_total: number
  drains_desilted: boolean
  emergency_contacts: number
}

interface CrowdsourceReport {
  id: string
  lat: number
  lng: number
  message: string
  timestamp: number
  severity: number
}

interface EnhancedMapProps {
  hotspots: HotspotPrediction[]
  route?: Route | null
  showTraffic: boolean
  showWards: boolean
  showCrowdsource: boolean
  rainfallIntensity: number
  wards: Ward[]
  crowdsourceReports: CrowdsourceReport[]
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

const createCrowdsourceIcon = (severity: number) => {
  const colors = ['#3b82f6', '#f59e0b', '#ef4444']
  const color = colors[severity] || colors[0]
  return divIcon({
    className: 'crowdsource-marker',
    html: `<div style="
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      animation: pulse 2s infinite;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  })
}

const toRadians = (deg: number) => (deg * Math.PI) / 180

const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const gradientColor = (distanceM: number) => {
  const maxDistance = 1200
  const t = Math.max(0, Math.min(1, 1 - distanceM / maxDistance))
  const blue = { r: 59, g: 130, b: 246 }
  const red = { r: 239, g: 68, b: 68 }
  const r = Math.round(lerp(blue.r, red.r, t))
  const g = Math.round(lerp(blue.g, red.g, t))
  const b = Math.round(lerp(blue.b, red.b, t))
  return `rgb(${r}, ${g}, ${b})`
}

function TrafficOverlay({ rainfallIntensity, showTraffic }: { rainfallIntensity: number; showTraffic: boolean }) {
  const map = useMap()
  
  useEffect(() => {
    if (!showTraffic) return
  }, [showTraffic, rainfallIntensity, map])
  
  return null
}

export default function EnhancedMap({
  hotspots,
  route,
  showTraffic,
  showWards,
  showCrowdsource,
  rainfallIntensity,
  wards,
  crowdsourceReports,
}: EnhancedMapProps) {
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

  const getWardColor = (score: number) => {
    if (score >= 80) return 'rgba(16, 185, 129, 0.4)'
    if (score >= 60) return 'rgba(245, 158, 11, 0.4)'
    return 'rgba(239, 68, 68, 0.4)'
  }

  const getRouteColor = () => {
    if (!route || route.warnings.length === 0) return '#3b82f6'
    return '#ef4444'
  }

  const riskHotspots = hotspots.filter((h) => h.risk_level > 0)
  const routeSegments = route && route.route.length > 1
    ? route.route.slice(0, -1).map((point, idx) => {
        const next = route.route[idx + 1]
        const midLat = (point[0] + next[0]) / 2
        const midLng = (point[1] + next[1]) / 2
        let nearest = Number.POSITIVE_INFINITY
        riskHotspots.forEach((h) => {
          const d = haversineMeters(midLat, midLng, h.lat, h.lng)
          if (d < nearest) nearest = d
        })
        const color = riskHotspots.length > 0 ? gradientColor(nearest) : getRouteColor()
        return { positions: [point, next], color }
      })
    : []

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
        
        <TrafficOverlay rainfallIntensity={rainfallIntensity} showTraffic={showTraffic} />

        {showWards && wards.map((ward) => (
          <Polygon
            key={ward.id}
            positions={ward.bounds}
            pathOptions={{
              color: getWardColor(ward.preparedness_score),
              fillColor: getWardColor(ward.preparedness_score),
              fillOpacity: 0.3,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">{ward.name}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Preparedness:</span>
                    <span className="font-semibold">{ward.preparedness_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Pumps:</span>
                    <span className="font-semibold">{ward.pumps_available}/{ward.pumps_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Drains Desilted:</span>
                    <span className={ward.drains_desilted ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {ward.drains_desilted ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Emergency Contacts:</span>
                    <span className="font-semibold">{ward.emergency_contacts}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {routeSegments.map((segment, idx) => (
          <Polyline
            key={`route-seg-${idx}`}
            positions={segment.positions}
            pathOptions={{
              color: segment.color,
              weight: 5,
              opacity: 0.9,
            }}
          />
        ))}

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
                    <span className="text-slate-600 dark:text-slate-300">Risk Level:</span>
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
                    <span className="text-slate-600 dark:text-slate-300">Probability:</span>
                    <span className="font-semibold">
                      {(hotspot.probability * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {showCrowdsource && crowdsourceReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.lat, report.lng]}
            icon={createCrowdsourceIcon(report.severity)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="text-sm text-slate-700 dark:text-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(report.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-medium">{report.message}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
