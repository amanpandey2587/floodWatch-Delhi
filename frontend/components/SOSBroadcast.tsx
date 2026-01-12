'use client'

import { useState } from 'react'
import { Radio, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react'

interface Ward {
  id: string
  name: string
}

interface SOSBroadcastProps {
  wards: Ward[]
}

export default function SOSBroadcast({ wards }: SOSBroadcastProps) {
  const [selectedWard, setSelectedWard] = useState(wards[0]?.id || '')
  const [message, setMessage] = useState('Emergency flood alert: Avoid flooded areas. Stay safe!')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleBroadcast = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/sos/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ward_id: selectedWard,
          message: message,
        }),
      })
      const data = await response.json()
      setResult(data)
      
      setTimeout(() => setResult(null), 5000)
    } catch (error) {
      console.error('Error broadcasting SOS:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-red-100 rounded-lg">
          <Radio className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Emergency Broadcast</h2>
          <p className="text-sm text-gray-600">Send critical alerts to ward residents</p>
        </div>
      </div>

      {result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800 mb-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Alert Broadcasted Successfully!</span>
          </div>
          <div className="text-sm text-green-700 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Ward: <strong>{result.ward}</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-green-200">
              <div>
                <div className="text-xs text-green-600">SMS Sent</div>
                <div className="text-lg font-bold">{result.sms_sent}</div>
              </div>
              <div>
                <div className="text-xs text-green-600">WhatsApp Groups</div>
                <div className="text-lg font-bold">{result.whatsapp_groups_notified}</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-green-200">
              <div className="text-xs text-green-600">Total Residents Notified</div>
              <div className="text-2xl font-bold">{result.residents_notified}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <strong>Important:</strong> Emergency broadcasts will immediately notify all residents in the selected ward via SMS and WhatsApp.
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Ward <span className="text-red-600">*</span>
          </label>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">-- Select a ward --</option>
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Alert Message <span className="text-red-600">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={300}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="Enter emergency alert message..."
          />
          <p className="mt-1 text-sm text-gray-500">{message.length}/300 characters</p>
        </div>

        <button
          onClick={handleBroadcast}
          disabled={loading || !selectedWard || !message.trim()}
          className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Broadcasting Emergency Alert...
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              Broadcast Emergency Alert
            </>
          )}
        </button>
      </div>
    </div>
  )
}