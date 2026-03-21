'use client'

import { useState, useEffect } from 'react'
import { Navigation, AlertTriangle, Wand2 } from 'lucide-react'
import { useRoutePrefill } from '@/hooks/useAssistantPrefill'

interface RouteCalculatorProps {
  onRouteCalculate: (route: { start: string; end: string }) => void
}

const LANDMARKS = ['CP', 'Dwarka', 'Minto Bridge', 'Karol Bagh', 'Civil Lines']

// Fuzzy match: find the closest landmark to an assistant-provided string
function matchLandmark(text: string): string | null {
  if (!text) return null
  const lower = text.toLowerCase()
  // exact match first
  const exact = LANDMARKS.find((l) => l.toLowerCase() === lower)
  if (exact) return exact
  // partial match
  const partial = LANDMARKS.find(
    (l) => l.toLowerCase().includes(lower) || lower.includes(l.toLowerCase())
  )
  return partial || null
}

export default function RouteCalculator({ onRouteCalculate }: RouteCalculatorProps) {
  const [start, setStart] = useState('CP')
  const [end, setEnd] = useState('Dwarka')
  const [loading, setLoading] = useState(false)
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null)

  // ── Assistant prefill ───────────────────────────────────────────────────────
  const { origin, destination, mode: prefillMode } = useRoutePrefill()

  useEffect(() => {
    if (!origin && !destination) return

    const messages: string[] = []

    if (origin) {
      const matched = matchLandmark(origin)
      if (matched) {
        setStart(matched)
        messages.push(`Start: ${matched}`)
      } else {
        // Origin not in landmarks list — still show it as a banner note
        messages.push(`Start: "${origin}" (select manually below)`)
      }
    }

    if (destination) {
      const matched = matchLandmark(destination)
      if (matched) {
        setEnd(matched)
        messages.push(`End: ${matched}`)
      } else {
        messages.push(`End: "${destination}" (select manually below)`)
      }
    }

    if (prefillMode && ["driving", "walking", "cycling"].includes(prefillMode)) {
      messages.push(`Mode: ${prefillMode}`)
    }
    if (messages.length > 0) {
      setPrefillBanner(`✨ Assistant prefilled — ${messages.join(' · ')}`)
    }
  }, [origin, destination, prefillMode])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    setLoading(true)
    onRouteCalculate({ start, end })
    setLoading(false)
  }

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-4 mb-4 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Get Safe Directions
        </h3>
      </div>

      {/* Assistant prefill banner */}
      {prefillBanner && (
        <div className="mb-3 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg text-xs">
          <Wand2 size={13} className="mt-0.5 flex-shrink-0" />
          <span>{prefillBanner}</span>
          <button
            onClick={() => setPrefillBanner(null)}
            className="ml-auto text-emerald-400 hover:text-emerald-600 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-3">
        {/* Start */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Start Location
          </label>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {LANDMARKS.map((landmark) => (
              <option key={landmark} value={landmark}>
                {landmark}
              </option>
            ))}
          </select>
        </div>

        {/* End */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            End Location
          </label>
          <select
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {LANDMARKS.map((landmark) => (
              <option key={landmark} value={landmark}>
                {landmark}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading || start === end}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium transition-colors"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Calculating…
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4" />
              Get Route
            </>
          )}
        </button>
      </div>
    </div>
  )
}