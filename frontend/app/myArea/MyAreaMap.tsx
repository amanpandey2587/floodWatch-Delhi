'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface AreaRisk {
  location: { lat: number; lon: number; village: string; ward: string }
  risk: { score: number; level: string; color: string; advice: string; category: string }
  terrain: { elevation_m: number; drain_distance_m: number }
  nearby_hotspots: Array<{ lat: number; lon: number; risk_score: number; distance_m: number; village: string }>
  preparedness: { score: number | null; level: string | null; color: string | null; actions: string | null; desilting: number | null }
}

// ── Result layer — redraws when API result changes ─────────────────────────
function ResultLayer({ result }: { result: AreaRisk | null }) {
  const map      = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.clearLayers()
    } else {
      layerRef.current = L.layerGroup().addTo(map)
    }

    if (!result) return

    const { location, risk, nearby_hotspots } = result

    // ── Pan + zoom to user ───────────────────────────────────────────────
    map.setView([location.lat, location.lon], 14, { animate: true })

    // ── User location pin ────────────────────────────────────────────────
    const userIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:36px;height:36px">
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:${risk.color};opacity:0.25;
            animation:pulse-ring 1.8s ease-out infinite
          "></div>
          <div style="
            position:absolute;top:6px;left:6px;
            width:24px;height:24px;border-radius:50%;
            background:${risk.color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.35)
          "></div>
        </div>
      `,
      iconSize:    [36, 36],
      iconAnchor:  [18, 18],
      popupAnchor: [0, -18],
    })

    L.marker([location.lat, location.lon], { icon: userIcon })
      .bindPopup(`
        <div style="font-size:13px;line-height:1.7;min-width:160px">
          <b style="font-size:14px">📍 You are here</b><br/>
          <span style="color:${risk.color};font-weight:600">${risk.level} risk</span><br/>
          ${location.village || 'Unknown village'}<br/>
          <span style="color:#64748b;font-size:11px">${risk.advice}</span>
        </div>
      `, { maxWidth: 240 })
      .openPopup()
      .addTo(layerRef.current)

    // ── 2km radius circle ────────────────────────────────────────────────
    L.circle([location.lat, location.lon], {
      radius:      2000,
      color:       risk.color,
      fillColor:   risk.color,
      fillOpacity: 0.04,
      weight:      1,
      dashArray:   '6 4',
    }).addTo(layerRef.current)

    // ── Nearby hotspot markers ───────────────────────────────────────────
    nearby_hotspots.forEach((h, i) => {
      const distLabel = h.distance_m < 1000
        ? `${Math.round(h.distance_m)} m`
        : `${(h.distance_m / 1000).toFixed(1)} km`

      const hotspotIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:20px;height:20px;border-radius:50%;
            background:#e24b4a;border:2px solid white;
            box-shadow:0 2px 4px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:700;color:white;font-family:sans-serif
          ">${i + 1}</div>
        `,
        iconSize:    [20, 20],
        iconAnchor:  [10, 10],
        popupAnchor: [0, -10],
      })

      // Line from user to hotspot
      L.polyline(
        [[location.lat, location.lon], [h.lat, h.lon]],
        { color: '#e24b4a', weight: 1, opacity: 0.4, dashArray: '4 4' }
      ).addTo(layerRef.current!)

      L.marker([h.lat, h.lon], { icon: hotspotIcon })
        .bindPopup(`
          <div style="font-size:12px;line-height:1.7">
            <b>High-risk zone ${i + 1}</b><br/>
            ${h.village || 'Unnamed area'}<br/>
            <span style="color:#e24b4a;font-weight:600">${distLabel} away</span><br/>
            Risk score: ${(h.risk_score * 100).toFixed(0)}%
          </div>
        `, { maxWidth: 200 })
        .addTo(layerRef.current!)
    })

  }, [result, map])

  return null
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MyAreaMap({ result }: { result: AreaRisk | null }) {
  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
      `}</style>

      <MapContainer
        center={[28.6139, 77.209]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ResultLayer result={result} />
      </MapContainer>
    </>
  )
}