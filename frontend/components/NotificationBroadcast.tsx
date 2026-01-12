'use client';

import { useState, useEffect } from 'react';
import { useAdminAPI } from '@/lib/api';
import { useUser } from '@clerk/nextjs';
import { Send, AlertCircle } from 'lucide-react';

interface NotificationBroadcastProps {
  onSuccess?: () => void;
}

export default function NotificationBroadcast({ onSuccess }: NotificationBroadcastProps) {
  const { user } = useUser();
  const adminAPI = useAdminAPI();
  const [wardNumber, setWardNumber] = useState<number>(44);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // TEMPORARY: For testing - always ward 44, but allow changing
  const role = 'ward_admin'; // Can be changed to 'admin' to allow ward selection

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await adminAPI.broadcast(wardNumber, title, message);
      setSuccess(true);
      setTitle('');
      setMessage('');
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send notification');
      console.error('Error broadcasting notification:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Send className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ward Notification</h2>
          <p className="text-sm text-gray-600">Send updates to ward residents</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          ✅ Notification sent successfully to Ward {wardNumber}!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ward_number" className="block text-sm font-medium text-gray-700 mb-2">
            Ward Number <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            id="ward_number"
            value={wardNumber}
            onChange={(e) => setWardNumber(parseInt(e.target.value))}
            required
            min="1"
            max="272"
            disabled={role === 'ward_admin'} // Locked for ward admins
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          {role === 'ward_admin' && (
            <p className="mt-1 text-sm text-gray-500">
              Ward admins can only broadcast to their assigned ward
            </p>
          )}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Waterlogging Alert"
          />
          <p className="mt-1 text-sm text-gray-500">{title.length}/100 characters</p>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message <span className="text-red-600">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            maxLength={500}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter notification message..."
          />
          <p className="mt-1 text-sm text-gray-500">{message.length}/500 characters</p>
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim() || !message.trim()}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Notification
            </>
          )}
        </button>
      </form>
    </div>
  );
}