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

  const userWardNumber = user?.publicMetadata?.ward_number as number | undefined;
  const role = (user?.publicMetadata?.role as string) || 'citizen';

  // Auto-set ward number if user is ward_admin
  useEffect(() => {
    if (userWardNumber && role === 'ward_admin') {
      setWardNumber(userWardNumber);
    }
  }, [userWardNumber, role]);

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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Ward Notification</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Notification sent successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ward_number" className="block text-sm font-medium text-gray-700 mb-2">
            Ward Number
          </label>
          <input
            type="number"
            id="ward_number"
            value={wardNumber}
            onChange={(e) => setWardNumber(parseInt(e.target.value))}
            required
            min="1"
            max="272"
            disabled={role === 'ward_admin'} // Ward admins can only broadcast to their ward
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          {role === 'ward_admin' && (
            <p className="mt-1 text-sm text-gray-500">You can only broadcast to your assigned ward</p>
          )}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
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
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message
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
          disabled={loading}
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
