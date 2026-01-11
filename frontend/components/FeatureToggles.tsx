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
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Map Layers</h3>
      <div className="space-y-2">
        <button
          onClick={onToggleTraffic}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
            showTraffic
              ? 'bg-orange-100 text-orange-700 border border-orange-300'
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
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
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
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
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
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

