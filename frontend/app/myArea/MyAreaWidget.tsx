'use client'

import { useState } from 'react'
import { API_BASE_URL } from '@/lib/api'

interface AreaRisk {
  location: { lat: number; lon: number; village: string; ward: string }
  risk: { score: number; category: string; level: string; color: string; advice: string }
  terrain: { elevation_m: number; drain_distance_m: number }
  nearby_hotspots: Array<{ lat: number; lon: number; risk_score: number; distance_m: number; village: string }>
  preparedness: { score: number | null; level: string | null; color: string | null; actions: string | null; desilting: number | null }
}

interface MyAreaWidgetProps {
  onResult?: (data: AreaRisk) => void
}

// ── Fix: destructure onResult from props ───────────────────────────────────
export default function MyAreaWidget({ onResult }: MyAreaWidgetProps) {
  const [result, setResult]   = useState<AreaRisk | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const checkMyArea = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/my-area?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          )
          if (!res.ok) throw new Error('Failed to fetch area risk')
          const data: AreaRisk = await res.json()
          console.log('[MyAreaWidget] result:', data)
          setResult(data)
          onResult?.(data)   // ← now works — onResult is in scope
        } catch (e: any) {
          setError(e.message || 'Something went wrong')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setLoading(false)
        setError('Location permission denied. Please allow location access.')
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  }

  return (
    <div className="space-y-3">

      {/* CTA button */}
      <button
        onClick={checkMyArea}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                   transition-all active:scale-95 disabled:opacity-60
                   bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Checking your area...
          </>
        ) : (
          <>
            <span style={{ fontSize: 16 }}>📍</span>
            Check My Area
          </>
        )}
      </button>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2 text-xs">

          {/* Risk banner */}
          <div
            className="rounded-xl px-4 py-3 text-white"
            style={{ background: result.risk.color }}
          >
            <div className="font-bold text-base mb-0.5">
              {result.risk.level} Risk&nbsp;·&nbsp;Score {result.risk.score.toFixed(2)}
            </div>
            <div className="opacity-90 text-xs">{result.risk.advice}</div>
          </div>

          {/* Location */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 space-y-0.5">
            <div className="font-medium text-slate-700 dark:text-slate-200">
              {result.location.village || 'Unknown village'}
            </div>
            <div className="text-slate-500">{result.location.ward}</div>
            <div className="text-slate-400">
              Elevation {result.terrain.elevation_m} m
              &nbsp;·&nbsp;
              Drain {result.terrain.drain_distance_m} m away
            </div>
          </div>

          {/* Preparedness */}
          {result.preparedness.score != null && (
            <div
              className="rounded-lg px-3 py-2 border"
              style={{
                borderColor: (result.preparedness.color ?? '#888') + '60',
                background:  (result.preparedness.color ?? '#888') + '12',
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-300">Village readiness</span>
                <span className="font-bold" style={{ color: result.preparedness.color ?? '#888' }}>
                  {result.preparedness.level}&nbsp;·&nbsp;{result.preparedness.score?.toFixed(1)}/100
                </span>
              </div>
              {result.preparedness.actions && (
                <div className="mt-1 text-amber-700 dark:text-amber-400">
                  {result.preparedness.actions.split(';')[0]}
                </div>
              )}
            </div>
          )}

          {/* Nearby hotspots */}
          {result.nearby_hotspots.length > 0 ? (
            <div className="space-y-1">
              <div className="text-slate-500 font-medium">
                {result.nearby_hotspots.length} high-risk zone
                {result.nearby_hotspots.length > 1 ? 's' : ''} nearby
              </div>
              {result.nearby_hotspots.map((h, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center px-3 py-1.5
                             bg-red-50 dark:bg-red-950/30 rounded-lg
                             border border-red-200 dark:border-red-900"
                >
                  <span className="text-red-700 dark:text-red-300">
                    {h.village || `Zone ${i + 1}`}
                  </span>
                  <span className="text-red-600 font-medium">
                    {h.distance_m < 1000
                      ? `${Math.round(h.distance_m)} m`
                      : `${(h.distance_m / 1000).toFixed(1)} km`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-1">
              No high-risk zones within 2 km
            </div>
          )}

        </div>
      )}
    </div>
  )
}