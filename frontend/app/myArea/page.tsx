'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import MyAreaWidget from './MyAreaWidget'

const MyAreaMap = dynamic(() => import('./MyAreaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 gap-3">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Loading map…</p>
    </div>
  ),
})

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

export default function MyAreaPage() {
  const [result, setResult] = useState<AreaRisk | null>(null)

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">

      {/* ── Full-screen map ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MyAreaMap result={result} />
      </div>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-3
                        bg-gradient-to-b from-white/80 to-transparent
                        dark:from-slate-950/80">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              My Area
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              Flood risk at your location
            </p>
          </div>
          <a
            href="/map"
            className="pointer-events-auto text-xs font-medium text-slate-700 dark:text-slate-200
                       bg-white/90 dark:bg-slate-800/90 backdrop-blur
                       px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                       shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
          >
            Full map →
          </a>
        </div>
      </header>

      {/* ── Bottom sheet ─────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <div
          className="bg-white dark:bg-slate-900 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)]
                     border-t border-slate-200 dark:border-slate-800
                     px-4 pt-2 pb-6 max-h-[60vh] overflow-y-auto"
        >
          {/* Drag handle */}
          <div className="w-9 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
          <MyAreaWidget onResult={setResult} />
        </div>
      </div>
    </main>
  )
}