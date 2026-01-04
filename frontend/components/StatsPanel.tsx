'use client'

import { AlertTriangle } from 'lucide-react'

interface StatsPanelProps {
  activeAlerts: number
  totalHotspots: number
}

export default function StatsPanel({ activeAlerts, totalHotspots }: StatsPanelProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-800">Active Alerts</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Critical (Red)</span>
          <span className="text-2xl font-bold text-red-600">{activeAlerts}</span>
        </div>
        
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Total Monitored</span>
            <span className="text-sm font-medium text-gray-700">{totalHotspots}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

