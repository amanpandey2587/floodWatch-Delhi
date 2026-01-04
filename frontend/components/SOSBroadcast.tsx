'use client'

import { useState } from 'react'
import { Radio, CheckCircle2, MessageSquare } from 'lucide-react'

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
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-5 h-5 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-800">Emergency Broadcast</h3>
      </div>

      {result && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Alert Broadcasted Successfully!</span>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <div>SMS sent to {result.sms_sent} residents in {result.ward}</div>
            <div>WhatsApp groups notified: {result.whatsapp_groups_notified}</div>
            <div className="flex items-center gap-1 mt-2">
              <MessageSquare className="w-4 h-4" />
              <span>Total residents notified: {result.residents_notified}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Ward
          </label>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Enter emergency alert message..."
          />
        </div>

        <button
          onClick={handleBroadcast}
          disabled={loading || !selectedWard}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Broadcasting...
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              Broadcast Alert
            </>
          )}
        </button>
      </div>
    </div>
  )
}
