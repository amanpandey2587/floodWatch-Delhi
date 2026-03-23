'use client'

import { useEffect, useRef } from 'react'
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, Polygon, useMap,
} from 'react-leaflet'
import L, { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Interfaces ─────────────────────────────────────────────────────────────────

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
  villagePreparedness: any | null
  prepFilter: string | null
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const mkIcon = (color: string) =>
  divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:${color};border:2px solid white;
      box-shadow:0 2px 4px rgba(0,0,0,0.3)
    "></div>`,
    iconSize:    [24, 24],
    iconAnchor:  [12, 12],
    popupAnchor: [0, -12],
  })

const mkCsIcon = (sev: number) =>
  divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${(['#3b82f6', '#f59e0b', '#ef4444'] as const)[sev] ?? '#3b82f6'};
      border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)
    "></div>`,
    iconSize:    [16, 16],
    iconAnchor:  [8, 8],
    popupAnchor: [0, -8],
  })

const safeIcon     = mkIcon('#10b981')
const warningIcon  = mkIcon('#f59e0b')
const criticalIcon = mkIcon('#ef4444')

// ── Geo helpers ────────────────────────────────────────────────────────────────

const toRad = (d: number) => (d * Math.PI) / 180

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R    = 6_371_000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const gradColor = (m: number) => {
  const t = Math.max(0, Math.min(1, 1 - m / 1200))
  return `rgb(${Math.round(lerp(59, 239, t))},${Math.round(lerp(130, 68, t))},${Math.round(lerp(246, 68, t))})`
}

// ── VillageLayer ───────────────────────────────────────────────────────────────
// Uses native Leaflet L.geoJSON — bypasses react-leaflet GeoJSON abstraction
// which silently drops popup bindings in Next.js SSR environments.

function VillageLayer({
  data,
  prepFilter,
}: {
  data: any
  prepFilter: string | null
}) {
  const map      = useMap()
  const layerRef = useRef<L.GeoJSON | null>(null)

  useEffect(() => {
    // Remove previous layer before adding new one
    if (layerRef.current) {
      layerRef.current.removeFrom(map)
      layerRef.current = null
    }

    if (!data?.features?.length) {
      console.log('[VillageLayer] no data or empty features array')
      return
    }

    console.log('[VillageLayer] rendering', data.features.length, 'villages')

    const geoLayer = L.geoJSON(data, {
      style: (feature: any) => ({
        fillColor:   feature?.properties?.PREP_COLOR ?? '#888888',
        fillOpacity: 0.35,
        color:       '#475569',
        weight:      1.5,
        opacity:     0.8,
      }),

      onEachFeature: (feature: any, layer: L.Layer) => {
        const p = feature.properties
        if (!p) return

        // Click log — tells us if events are firing
        layer.on('click', () => {
          console.log('[Village clicked]', {
            village:    p.VILLAGE,
            level:      p.PREP_LEVEL,
            score:      p.PREP_SCORE,
            district:   p.DISTRICT,
            desilting:  p.DESILTING_PCT,
            highRisk:   p.HIGH_RISK_CELLS,
            total:      p.TOTAL_CELLS,
            actions:    p.ACTIONS,
          })
        })

        layer.bindPopup(`
          <div style="
            min-width:190px;
            font-size:12px;
            line-height:1.9;
            font-family:sans-serif;
            padding:2px
          ">
            <div style="font-size:14px;font-weight:700;margin-bottom:2px">
              ${p.PREP_LEVEL === 'Prepared' ? '✓' : '⚠'}&nbsp;${p.VILLAGE ?? '—'}
            </div>
            <div style="color:${p.PREP_COLOR ?? '#888'};font-weight:600">
              ${p.PREP_LEVEL ?? '—'}&nbsp;·&nbsp;${p.PREP_SCORE != null ? Number(p.PREP_SCORE).toFixed(1) : '—'}/100
            </div>
            <hr style="margin:5px 0;border:none;border-top:1px solid #e2e8f0"/>
            Tehsil:&nbsp;<b>${p.TEHSIL ?? '—'}</b><br/>
            District:&nbsp;<b>${p.DISTRICT ?? '—'}</b><br/>
            Desilting:&nbsp;<b>${p.DESILTING_PCT ?? '—'}%</b><br/>
            High-risk cells:&nbsp;<b>${p.HIGH_RISK_CELLS ?? 0}&nbsp;/&nbsp;${p.TOTAL_CELLS ?? 0}</b><br/>
            <div style="
              margin-top:6px;
              padding:4px 8px;
              background:#fef3c7;
              border-radius:6px;
              color:#92400e;
              font-size:11px;
              line-height:1.5
            ">
              ${p.ACTIONS ?? 'No critical gaps identified'}
            </div>
          </div>
        `, { maxWidth: 300 })
      },
    })

    geoLayer.addTo(map)
    layerRef.current = geoLayer

    return () => {
      geoLayer.removeFrom(map)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, prepFilter])

  return null
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EnhancedMap({
  hotspots,
  route,
  showTraffic,
  showWards,
  showCrowdsource,
  rainfallIntensity,
  wards,
  crowdsourceReports,
  villagePreparedness,
  prepFilter,
}: EnhancedMapProps) {

  const getIcon   = (l: number) => l === 2 ? criticalIcon : l === 1 ? warningIcon : safeIcon
  const riskLabel = (l: number) => (['Safe', 'Warning', 'Critical'] as const)[l] ?? 'Unknown'
  const wardColor = (s: number) =>
    s >= 80 ? 'rgba(16,185,129,0.4)' : s >= 60 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'

  const riskHotspots = hotspots.filter(h => h.risk_level > 0)
  const routeColor   = route?.warnings.length ? '#ef4444' : '#3b82f6'

  const routeSegs =
    route && route.route.length > 1
      ? route.route.slice(0, -1).map((pt, i) => {
          const nx   = route.route[i + 1]
          const mLat = (pt[0] + nx[0]) / 2
          const mLng = (pt[1] + nx[1]) / 2
          let near   = Infinity
          riskHotspots.forEach(h => {
            const d = haversine(mLat, mLng, h.lat, h.lng)
            if (d < near) near = d
          })
          return {
            positions: [pt, nx] as [number, number][],
            color: riskHotspots.length ? gradColor(near) : routeColor,
          }
        })
      : []

  console.log('[EnhancedMap] villagePreparedness:', villagePreparedness?.features?.length ?? 'null')

  return (
    <div className="w-full h-full">
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Village preparedness — imperative native Leaflet layer */}
        <VillageLayer data={villagePreparedness} prepFilter={prepFilter} />

        {/* Ward polygons */}
        {showWards && wards.map(w => (
          <Polygon
            key={w.id}
            positions={w.bounds}
            pathOptions={{
              color:       wardColor(w.preparedness_score),
              fillColor:   wardColor(w.preparedness_score),
              fillOpacity: 0.3,
              weight:      2,
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-base mb-2">{w.name}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Preparedness</span>
                    <span className="font-semibold">{w.preparedness_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pumps</span>
                    <span className="font-semibold">{w.pumps_available}/{w.pumps_total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Drains desilted</span>
                    <span className={w.drains_desilted ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {w.drains_desilted ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Emergency contacts</span>
                    <span className="font-semibold">{w.emergency_contacts}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Route polyline */}
        {routeSegs.map((s, i) => (
          <Polyline
            key={`route-${i}`}
            positions={s.positions}
            pathOptions={{ color: s.color, weight: 5, opacity: 0.9 }}
          />
        ))}

        {/* Hotspot markers */}
        {hotspots.map(h => (
          <Marker key={h.id} position={[h.lat, h.lng]} icon={getIcon(h.risk_level)}>
            <Popup>
              <div className="p-2 min-w-[180px]">
                <h3 className="font-bold mb-1">{h.name}</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Risk</span>
                    <span className={`font-semibold ${
                      h.risk_level === 0 ? 'text-green-600'
                      : h.risk_level === 1 ? 'text-orange-600'
                      : 'text-red-600'
                    }`}>
                      {riskLabel(h.risk_level)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Probability</span>
                    <span className="font-semibold">{(h.probability * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Crowdsource markers */}
        {showCrowdsource && crowdsourceReports.map(r => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={mkCsIcon(r.severity)}>
            <Popup>
              <div className="p-2 min-w-[180px] text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-slate-400">
                    {new Date(r.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <p className="font-medium">{r.message}</p>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  )
}