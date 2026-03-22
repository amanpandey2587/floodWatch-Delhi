'use client'

import { useState } from 'react'
import { Radio, CheckCircle2, MessageSquare, Smartphone, AlertTriangle } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'
import { useAuth } from '@/lib/AuthContext'

interface Ward {
  id: string
  name: string
}

interface SOSBroadcastProps {
  wards: Ward[]
}

interface BroadcastResult {
  ward: string
  sms_sent: number
  whatsapp_sent: number
  residents_notified: number
  skipped_no_phone: number
  broadcast_id: string
  timestamp: string
}

export default function SOSBroadcast({ wards }: SOSBroadcastProps) {
  const { user } = useAuth()
  const [selectedWard, setSelectedWard] = useState(wards[0]?.id || '')
  const [message, setMessage] = useState('Emergency flood alert: Avoid flooded areas and stay on higher ground. Stay safe!')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBroadcast = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/sos/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          ward_id: selectedWard,
          message: message.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || `Request failed: ${response.statusText}`)
      }

      setResult(data)
      setTimeout(() => setResult(null), 8000)
    } catch (err: any) {
      console.error('SOS broadcast error:', err)
      setError(err.message || 'Failed to send broadcast')
    } finally {
      setLoading(false)
    }
  }

  const selectedWardName = wards.find(w => w.id === selectedWard)?.name || `Ward ${selectedWard}`

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Emergency SOS Broadcast</h2>
          <p className="text-red-100 text-xs">SMS + WhatsApp to all registered users city-wide</p>
        </div>
      </div>

      <div className="p-6">
        {/* Success result */}
        {result && (
          <div className="mb-5 p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">City-wide alert sent! (originated from {result.ward})</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center">
                <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{result.sms_sent}</div>
                <div className="text-xs text-green-600 dark:text-green-400">SMS sent</div>
              </div>
              <div className="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center">
                <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{result.whatsapp_sent}</div>
                <div className="text-xs text-green-600 dark:text-green-400">WhatsApp sent</div>
              </div>
              <div className="bg-white dark:bg-green-900/30 rounded-lg p-3 text-center border-2 border-green-300 dark:border-green-700">
                <Radio className="w-4 h-4 text-green-700 dark:text-green-300 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-800 dark:text-green-200">{result.residents_notified}</div>
                <div className="text-xs text-green-700 dark:text-green-300">Residents notified</div>
              </div>
            </div>

            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Broadcast ID: {result.broadcast_id} · {new Date(result.timestamp).toLocaleTimeString()}
              {result.skipped_no_phone > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  · {result.skipped_no_phone} residents skipped (no phone number)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Warning banner */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <strong>City-wide alert:</strong> This will immediately send SMS + WhatsApp to <strong>all registered users across Delhi</strong>, regardless of ward.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Target Ward <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="">— Select a ward —</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>{ward.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Alert Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Enter emergency alert message..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400">Sent as-is via SMS and WhatsApp</span>
              <span className={`text-xs ${message.length > 280 ? 'text-red-500' : 'text-slate-400'}`}>
                {message.length}/300
              </span>
            </div>
          </div>

          {/* Channel badges */}
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-800">
              <Smartphone className="w-3 h-3" /> SMS via Fast2SMS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-xs rounded-full border border-green-200 dark:border-green-800">
              <MessageSquare className="w-3 h-3" /> WhatsApp Business API
            </span>
          </div>

          <button
            onClick={handleBroadcast}
            disabled={loading || !selectedWard || !message.trim()}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-2.5 px-6 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending to all users city-wide...
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                Broadcast Emergency Alert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}