'use client'

import { useEffect, useState } from 'react'
import { Map, AlertTriangle, Shield } from 'lucide-react'

interface WardRisk {
  ward_id: string
  ward_name: string
  risk_level: number
  critical_hotspots: number
  warning_hotspots: number
  safe_hotspots: number
  total_hotspots: number
  preparedness_score: number
  preparedness_level: string
  has_preparedness_gap: boolean
  preparedness_gap_message: string
  pumps_available: number
  pumps_total: number
  drains_desilted: boolean
}

interface WardRiskPanelProps {
  rainfallIntensity: number
}

export default function WardRiskPanel({ rainfallIntensity }: WardRiskPanelProps) {
  const [wardRisks, setWardRisks] = useState<WardRisk[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchWardRisks = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:8000/wards/risk?rainfall_intensity=${rainfallIntensity}`)
        const data = await response.json()
        setWardRisks(data.ward_risks || [])
      } catch (error) {
        console.error('Error fetching ward risks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWardRisks()
  }, [rainfallIntensity])

  const getRiskColor = (riskLevel: number) => {
    switch (riskLevel) {
      case 0:
        return 'text-green-600 bg-green-50 border-green-200'
      case 1:
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 2:
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRiskLabel = (riskLevel: number) => {
    switch (riskLevel) {
      case 0:
        return 'Safe'
      case 1:
        return 'Warning'
      case 2:
        return 'Critical'
      default:
        return 'Unknown'
    }
  }

  const getPreparednessColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[350px]">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading ward risks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[350px] max-h-[600px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Map className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Ward Risk Index</h3>
      </div>

      <div className="space-y-3">
        {wardRisks.map((ward) => (
          <div
            key={ward.ward_id}
            className={`border rounded-lg p-3 ${getRiskColor(ward.risk_level)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{ward.ward_name}</h4>
              <span className="text-xs font-bold px-2 py-1 rounded">
                {getRiskLabel(ward.risk_level)}
              </span>
            </div>

            <div className="text-xs space-y-1 mb-2">
              <div className="flex justify-between">
                <span>Hotspots:</span>
                <span>
                  <span className="text-red-600 font-semibold">{ward.critical_hotspots}</span>/
                  <span className="text-orange-600 font-semibold">{ward.warning_hotspots}</span>/
                  <span className="text-green-600 font-semibold">{ward.safe_hotspots}</span>
                </span>
              </div>
            </div>

            {/* Preparedness Score */}
            <div className="mt-2 pt-2 border-t border-current/20">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span className="text-xs font-medium">Preparedness:</span>
                </div>
                <span className={`text-xs font-bold ${getPreparednessColor(ward.preparedness_score)}`}>
                  {ward.preparedness_score}% ({ward.preparedness_level})
                </span>
              </div>
              
              <div className="text-xs">
                <div className="flex justify-between">
                  <span>Pumps:</span>
                  <span>{ward.pumps_available}/{ward.pumps_total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Drains:</span>
                  <span>{ward.drains_desilted ? 'Desilted ✓' : 'Not Desilted ✗'}</span>
                </div>
              </div>

              {/* Preparedness Gap Warning */}
              {ward.has_preparedness_gap && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs">
                  <div className="flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-red-800 font-medium">
                      {ward.preparedness_gap_message || 'Preparedness GAP: Insufficient infrastructure'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

