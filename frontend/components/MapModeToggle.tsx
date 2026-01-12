'use client'

import { Map, Box, Navigation } from 'lucide-react'

interface MapModeToggleProps {
  currentMode: 'leaflet' | 'google-standard' | 'google-3d' | 'google-streetview'
  onModeChange: (mode: 'leaflet' | 'google-standard' | 'google-3d' | 'google-streetview') => void
}

export default function MapModeToggle({ currentMode, onModeChange }: MapModeToggleProps) {
  const modes = [
    { id: 'leaflet' as const, label: '2D Map', icon: Map, description: 'OpenStreetMap' },
    { id: 'google-standard' as const, label: 'Google 2D', icon: Map, description: 'Google Maps' },
    { id: 'google-3d' as const, label: '3D View', icon: Box, description: 'Satellite 3D' },
    { id: 'google-streetview' as const, label: 'Street View', icon: Navigation, description: 'Ground Level' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Map className="w-5 h-5" />
        Map Display Mode
      </h3>
      <div className="space-y-2">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = currentMode === mode.id
          
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
              <div className="flex-1 text-left">
                <div className="font-medium">{mode.label}</div>
                <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                  {mode.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </button>
          )
        })}
      </div>
      
      {currentMode.startsWith('google') && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Tip:</span> Use the map controls to navigate in {currentMode === 'google-3d' ? '3D' : currentMode === 'google-streetview' ? 'Street View' : 'Google Maps'} mode
          </p>
        </div>
      )}
    </div>
  )
}