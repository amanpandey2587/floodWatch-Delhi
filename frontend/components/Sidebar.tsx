'use client'

import { useState, useEffect } from 'react'
import { Droplets } from 'lucide-react'

interface SidebarProps {
  rainfallIntensity: number
  onRainfallChange: (value: number) => void
  loading: boolean
}

export default function Sidebar({
  rainfallIntensity,
  onRainfallChange,
  loading,
}: SidebarProps) {
  const [localValue, setLocalValue] = useState(rainfallIntensity)

  useEffect(() => {
    setLocalValue(rainfallIntensity)
  }, [rainfallIntensity])

  useEffect(() => {
    const timer = setTimeout(() => {
      onRainfallChange(localValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [localValue, onRainfallChange])

  const getIntensityLabel = (value: number) => {
    if (value < 10) return 'Light'
    if (value < 30) return 'Moderate'
    if (value < 60) return 'Heavy'
    if (value < 100) return 'Very Heavy'
    return 'Extreme'
  }

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Simulation Control</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Rainfall Intensity (mm/hr)
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={localValue}
            onChange={(e) => setLocalValue(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">0</span>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {localValue.toFixed(0)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {getIntensityLabel(localValue)}
              </div>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">200</span>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Updating predictions...</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Move the slider to simulate different rainfall intensities and see
            real-time flood risk predictions for Delhi hotspots.
          </p>
        </div>
      </div>
    </div>
  )
}
