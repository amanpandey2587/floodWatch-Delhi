'use client';

import { useState, useEffect } from 'react';
import { useAdminAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Send, AlertCircle } from 'lucide-react';

interface NotificationBroadcastProps {
  onSuccess?: () => void;
}

export default function NotificationBroadcast({ onSuccess }: NotificationBroadcastProps) {
  const { user } = useAuth();
  const adminAPI = useAdminAPI();
  const [wardNumber, setWardNumber] = useState<number>(user?.ward_number ?? 44);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user?.ward_number) {
      setWardNumber(user.ward_number);
    }
  }, [user?.ward_number]);

  const role = user?.role || 'citizen';

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
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Send className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ward Notification</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Send updates to ward residents</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg mb-4">
          Notification sent successfully to Ward {wardNumber}.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ward_number" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
            disabled={role === 'ward_officer'} // Locked for ward officers
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 dark:disabled:bg-slate-800"
          />
          {role === 'ward_officer' && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ward officers can only broadcast to their assigned ward
            </p>
          )}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Waterlogging Alert"
          />
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{title.length}/100 characters</p>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Message <span className="text-red-600">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            maxLength={500}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter notification message..."
          />
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message.length}/500 characters</p>
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
