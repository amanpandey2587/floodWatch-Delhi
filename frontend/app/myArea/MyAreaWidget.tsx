'use client'

import { useState } from 'react'
import { API_BASE_URL } from '@/lib/api'

/* ── Types ──────────────────────────────────────────────────────────────── */

interface AreaRisk {
  location: { lat: number; lon: number; village: string; ward: string }
  risk: { score: number; category: string; level: string; color: string; advice: string }
  terrain: { elevation_m: number; drain_distance_m: number }
  nearby_hotspots: Array<{
    lat: number; lon: number; risk_score: number; distance_m: number; village: string
  }>
  preparedness: {
    score: number | null; level: string | null; color: string | null
    actions: string | null; desilting: number | null
  }
}

interface MyAreaWidgetProps {
  onResult?: (data: AreaRisk) => void
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

function riskPercent(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score * 100)))
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function MyAreaWidget({ onResult }: MyAreaWidgetProps) {
  const [result, setResult]       = useState<AreaRisk | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualLat, setManualLat]   = useState('')
  const [manualLon, setManualLon]   = useState('')

  /* ── Fetch logic ──────────────────────────────────────────────────────── */

  const fetchAreaRisk = async (lat: number, lon: number) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/my-area?lat=${lat}&lon=${lon}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `Server error (${res.status})`)
      }
      const data: AreaRisk = await res.json()
      setResult(data)
      setCheckedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      onResult?.(data)
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const checkWithGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchAreaRisk(pos.coords.latitude, pos.coords.longitude),
      () => {
        setLoading(false)
        setError('Location permission denied. Allow access or enter coordinates manually.')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const checkManual = () => {
    const lat = parseFloat(manualLat)
    const lon = parseFloat(manualLon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError('Enter valid latitude and longitude values.')
      return
    }
    fetchAreaRisk(lat, lon)
  }

  /* ── Initial state (no result yet) ────────────────────────────────────── */
  if (!result && !loading) {
    return (
      <div className="space-y-3">
        {/* Explanation */}
        <div className="text-center space-y-1 pb-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            How safe is your area?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            Share your location to see flood risk, nearby danger zones,
            terrain data, and village preparedness — all in real time.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={checkWithGPS}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white
                     bg-blue-600 hover:bg-blue-700 active:scale-[0.98]
                     transition-all flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
          </svg>
          Use My Location
        </button>

        {/* Manual fallback toggle */}
        <button
          onClick={() => setManualMode(!manualMode)}
          className="w-full text-xs text-slate-500 dark:text-slate-400 py-1
                     hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          {manualMode ? 'Hide manual input' : 'Or enter coordinates manually'}
        </button>

        {manualMode && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Latitude (e.g. 28.63)"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700
                           bg-slate-50 dark:bg-slate-800 text-sm
                           text-slate-800 dark:text-slate-200
                           placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude (e.g. 77.22)"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700
                           bg-slate-50 dark:bg-slate-800 text-sm
                           text-slate-800 dark:text-slate-200
                           placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={checkManual}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white
                         bg-slate-800 dark:bg-slate-200 dark:text-slate-900
                         hover:bg-slate-700 dark:hover:bg-slate-300
                         active:scale-[0.98] transition-all"
            >
              Check This Location
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400
                          bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900
                          rounded-lg px-3 py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  /* ── Loading state ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Analysing your area…
        </p>
        <p className="text-xs text-slate-400">
          Checking risk, terrain & nearby hotspots
        </p>
      </div>
    )
  }

  /* ── Error state (after attempt) ──────────────────────────────────────── */
  if (error && !result) {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400
                        bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900
                        rounded-lg px-3 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-medium">Could not check your area</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
        <button
          onClick={checkWithGPS}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white
                     bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  /* ── Result state ─────────────────────────────────────────────────────── */
  if (!result) return null
  const { risk, location, terrain, nearby_hotspots, preparedness } = result

  return (
    <div className="space-y-3">

      {/* ── 1. Risk summary ───────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: risk.color }}>
        <div className="px-4 py-3 text-white">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide font-medium opacity-80">
                Flood Risk Level
              </p>
              <p className="text-xl font-bold leading-tight">{risk.level}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{riskPercent(risk.score)}<span className="text-sm font-medium">%</span></div>
              <p className="text-[10px] uppercase tracking-wide opacity-70">risk score</p>
            </div>
          </div>

          {/* Risk bar */}
          <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-white/90 transition-all duration-500"
              style={{ width: `${riskPercent(risk.score)}%` }}
            />
          </div>

          <p className="text-xs opacity-90 leading-relaxed">{risk.advice}</p>
        </div>
      </div>

      {/* ── 2. Location & terrain ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
          Location & Terrain
        </p>

        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
              {location.village || 'Unknown village'}
            </p>
            {location.ward && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{location.ward}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
              Elevation
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {terrain.elevation_m.toFixed(1)}<span className="text-xs font-normal text-slate-500 ml-0.5">m</span>
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-0.5">
              Nearest Drain
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {formatDistance(terrain.drain_distance_m)}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Preparedness ───────────────────────────────────────────────── */}
      {preparedness.score != null && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
            Village Preparedness
          </p>

          <div className="flex items-center justify-between">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: preparedness.color ?? '#555',
                backgroundColor: (preparedness.color ?? '#555') + '18',
              }}
            >
              {preparedness.level ?? 'Unknown'}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {preparedness.score.toFixed(0)}<span className="text-xs font-normal text-slate-500">/100</span>
            </span>
          </div>

          {/* Score bar */}
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, preparedness.score))}%`,
                backgroundColor: preparedness.color ?? '#888',
              }}
            />
          </div>

          {/* Desilting */}
          {preparedness.desilting != null && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 dark:text-slate-400">Drain desilting</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {preparedness.desilting.toFixed(0)}% complete
              </span>
            </div>
          )}

          {/* Action item (first one) */}
          {preparedness.actions && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400
                            bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900
                            rounded-lg px-2.5 py-2 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span className="leading-relaxed">{preparedness.actions.split(';')[0].trim()}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Nearby hotspots ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
          Nearby Danger Zones
          <span className="ml-1 text-slate-300 dark:text-slate-600">
            (within 2 km)
          </span>
        </p>

        {nearby_hotspots.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400
                          bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200
                          dark:border-emerald-900 rounded-lg px-3 py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>No high-risk zones within 2 km of your location.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {nearby_hotspots.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-lg
                           bg-white dark:bg-slate-800 border border-slate-100
                           dark:border-slate-700"
              >
                {/* Numbered badge */}
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40
                                flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                    {i + 1}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                    {h.village || `Danger zone ${i + 1}`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Risk {riskPercent(h.risk_score)}%
                  </p>
                </div>

                {/* Distance */}
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                  {formatDistance(h.distance_m)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Footer: recheck + timestamp ────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={checkWithGPS}
          disabled={loading}
          className="text-xs font-medium text-blue-600 dark:text-blue-400
                     hover:text-blue-700 dark:hover:text-blue-300
                     disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
          </svg>
          Recheck
        </button>
        {checkedAt && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Checked at {checkedAt}
          </span>
        )}
      </div>
    </div>
  )
}