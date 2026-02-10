'use client'

import { AlertTriangle } from 'lucide-react'

interface StatsPanelProps {
  activeAlerts: number
  totalHotspots: number
}

export default function StatsPanel({ activeAlerts, totalHotspots }: StatsPanelProps) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[200px] border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Active Alerts</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600 dark:text-slate-300">Critical (Red)</span>
          <span className="text-2xl font-bold text-red-600">{activeAlerts}</span>
        </div>
        
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Monitored</span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{totalHotspots}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

