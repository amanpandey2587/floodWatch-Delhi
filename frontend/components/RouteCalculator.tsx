'use client'

import { useState } from 'react'
import { Navigation, AlertTriangle } from 'lucide-react'

interface RouteCalculatorProps {
  onRouteCalculate: (route: { start: string; end: string }) => void
}

export default function RouteCalculator({ onRouteCalculate }: RouteCalculatorProps) {
  const [start, setStart] = useState('CP')
  const [end, setEnd] = useState('Dwarka')
  const [loading, setLoading] = useState(false)

  const landmarks = ['CP', 'Dwarka', 'Minto Bridge', 'Karol Bagh', 'Civil Lines']

  const handleCalculate = async () => {
    setLoading(true)
    onRouteCalculate({ start, end })
    setLoading(false)
  }

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-4 mb-4 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Get Safe Directions</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Start Location
          </label>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {landmarks.map((landmark) => (
              <option key={landmark} value={landmark}>
                {landmark}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            End Location
          </label>
          <select
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {landmarks.map((landmark) => (
              <option key={landmark} value={landmark}>
                {landmark}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading || start === end}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Calculating...
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

