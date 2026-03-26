'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import MyAreaWidget from './MyAreaWidget'

const MyAreaMap = dynamic(() => import('./MyAreaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

interface AreaRisk {
  location: { lat: number; lon: number; village: string; ward: string }
  risk: { score: number; level: string; color: string; advice: string; category: string }
  terrain: { elevation_m: number; drain_distance_m: number }
  nearby_hotspots: Array<{ lat: number; lon: number; risk_score: number; distance_m: number; village: string }>
  preparedness: { score: number | null; level: string | null; color: string | null; actions: string | null; desilting: number | null }
}

export default function MyAreaPage() {
  const [result, setResult] = useState<AreaRisk | null>(null)

  return (
    <main className="relative w-screen h-screen overflow-hidden">

      {/* Full screen map */}
      <div className="absolute inset-0 z-0">
        <MyAreaMap result={result} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 drop-shadow-md">
              FloodWatch Delhi
            </h1>
            <p className="text-xs text-slate-700 drop-shadow">My Area Risk</p>
          </div>
          <a
            href="/map"
            className="pointer-events-auto text-xs text-slate-600 bg-white/80
                       px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
          >
            Full map →
          </a>
        </div>
      </div>

      {/* Bottom card — widget lives here */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 rounded-t-2xl shadow-2xl
                        border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-6
                        max-h-[55vh] overflow-y-auto">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
          <MyAreaWidget onResult={setResult} />
        </div>
      </div>

    </main>
  )
}