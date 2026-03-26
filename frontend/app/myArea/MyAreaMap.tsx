'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface AreaRisk {
  location: { lat: number; lon: number; village: string; ward: string }
  risk: { score: number; level: string; color: string; advice: string; category: string }
  terrain: { elevation_m: number; drain_distance_m: number }
  nearby_hotspots: Array<{
    lat: number; lon: number; risk_score: number; distance_m: number; village: string
  }>
  preparedness: {
    score: number | null; level: string | null; color: string | null
    actions: string | null; desilting: number | null
  }
}

/* ── Result layer — redraws when API result changes ─────────────────────── */
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

    // ── 2 km radius circle ───────────────────────────────────────────────
    L.circle([location.lat, location.lon], {
      radius:      2000,
      color:       risk.color,
      fillColor:   risk.color,
      fillOpacity: 0.04,
      weight:      1.5,
      dashArray:   '6 4',
    }).addTo(layerRef.current)

    // ── Dashed lines from user to each hotspot (draw first so they sit under markers) ──
    nearby_hotspots.forEach((h) => {
      L.polyline(
        [[location.lat, location.lon], [h.lat, h.lon]],
        { color: '#e24b4a', weight: 1, opacity: 0.35, dashArray: '4 4' },
      ).addTo(layerRef.current!)
    })

    // ── User location marker ─────────────────────────────────────────────
    const userIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:40px;height:40px">
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:${risk.color};opacity:0.2;
            animation:myarea-pulse 2s ease-out infinite
          "></div>
          <div style="
            position:absolute;top:8px;left:8px;
            width:24px;height:24px;border-radius:50%;
            background:${risk.color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3)
          "></div>
        </div>
      `,
      iconSize:    [40, 40],
      iconAnchor:  [20, 20],
      popupAnchor: [0, -20],
    })

    const riskPct = Math.round(risk.score * 100)

    L.marker([location.lat, location.lon], { icon: userIcon })
      .bindPopup(
        `<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.6;min-width:170px">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">📍 Your Location</div>
          <div style="display:inline-block;padding:2px 8px;border-radius:6px;color:#fff;font-weight:600;font-size:12px;background:${risk.color}">
            ${risk.level} · ${riskPct}%
          </div>
          <div style="margin-top:6px;color:#334155;font-size:12px">${location.village || 'Unknown area'}</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px">${risk.advice}</div>
        </div>`,
        { maxWidth: 260 },
      )
      .openPopup()
      .addTo(layerRef.current)

    // ── Nearby hotspot markers ───────────────────────────────────────────
    nearby_hotspots.forEach((h, i) => {
      const distLabel = h.distance_m < 1000
        ? `${Math.round(h.distance_m)} m`
        : `${(h.distance_m / 1000).toFixed(1)} km`

      const hotspotIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:22px;height:22px;border-radius:50%;
            background:#dc2626;border:2px solid white;
            box-shadow:0 2px 4px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:700;color:white;font-family:system-ui,sans-serif
          ">${i + 1}</div>
        `,
        iconSize:    [22, 22],
        iconAnchor:  [11, 11],
        popupAnchor: [0, -11],
      })

      L.marker([h.lat, h.lon], { icon: hotspotIcon })
        .bindPopup(
          `<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.6">
            <div style="font-weight:700;color:#dc2626">⚠ Danger Zone ${i + 1}</div>
            <div style="color:#334155">${h.village || 'Unnamed area'}</div>
            <div style="color:#64748b;font-size:11px">
              ${distLabel} away · Risk ${Math.round(h.risk_score * 100)}%
            </div>
          </div>`,
          { maxWidth: 200 },
        )
        .addTo(layerRef.current!)
    })
  }, [result, map])

  return null
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function MyAreaMap({ result }: { result: AreaRisk | null }) {
  return (
    <>
      <style>{`
        @keyframes myarea-pulse {
          0%   { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0;   }
        }
        .leaflet-control-attribution { font-size: 10px !important; opacity: 0.6; }
      `}</style>

      <MapContainer
        center={[28.6139, 77.209]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ResultLayer result={result} />
      </MapContainer>
    </>
  )
}