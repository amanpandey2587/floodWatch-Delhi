'use client'

import { TrafficCone, Map, MessageSquare } from 'lucide-react'

interface FeatureTogglesProps {
  showTraffic: boolean
  showWards: boolean
  showCrowdsource: boolean
  onToggleTraffic: () => void
  onToggleWards: () => void
  onToggleCrowdsource: () => void
}

export default function FeatureToggles({
  showTraffic,
  showWards,
  showCrowdsource,
  onToggleTraffic,
  onToggleWards,
  onToggleCrowdsource,
}: FeatureTogglesProps) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-4 border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Map Layers</h3>
      <div className="space-y-2">
        <button
          onClick={onToggleTraffic}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
            showTraffic
              ? 'bg-orange-100 text-orange-700 border border-orange-300'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <TrafficCone className="w-5 h-5" />
          <span className="font-medium">Traffic Overlay</span>
          {showTraffic && <span className="ml-auto text-xs">ON</span>}
        </button>

        <button
          onClick={onToggleWards}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
            showWards
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Map className="w-5 h-5" />
          <span className="font-medium">Ward Heatmap</span>
          {showWards && <span className="ml-auto text-xs">ON</span>}
        </button>

        <button
          onClick={onToggleCrowdsource}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
            showCrowdsource
              ? 'bg-purple-100 text-purple-700 border border-purple-300'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">Crowdsource Pulse</span>
          {showCrowdsource && <span className="ml-auto text-xs">ON</span>}
        </button>
      </div>
    </div>
  )
}

