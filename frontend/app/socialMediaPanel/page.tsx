'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface WardRisk {
  mention_count: number;
  avg_urgency: number;
  avg_sentiment: number;
  risk_spike: number;
}

interface SocialPost {
  platform: string;
  text: string;
  ward: string;
  urgency: number;
  timestamp: string;
}

interface MonitoringData {
  timestamp: string;
  total_posts: number;
  ward_analysis: Record<string, WardRisk>;
  recent_posts: SocialPost[];
}

export default function SocialMediaPanel() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/social/monitor/status`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setMonitoringData(data.data);
        setError(null);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError('Failed to fetch monitoring data');
      console.error(err);
    }
  };

  const startMonitoring = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/social/monitor/start?hours_back=24`,
        { method: 'POST' }
      );
      const data = await response.json();
      
      if (data.status === 'started') {
        // Wait a bit then fetch results
        setTimeout(() => {
          fetchMonitoringData();
          setLoading(false);
        }, 5000);
      }
    } catch (err: any) {
      setError('Failed to start monitoring');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, 60000); // Refresh every minute
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getRiskColor = (riskSpike: number): string => {
    if (riskSpike > 0.7) return '#e74c3c';
    if (riskSpike > 0.5) return '#e67e22';
    if (riskSpike > 0.3) return '#f1c40f';
    return '#2ecc71';
  };

  const getRiskLabel = (riskSpike: number): string => {
    if (riskSpike > 0.7) return 'CRITICAL';
    if (riskSpike > 0.5) return 'HIGH';
    if (riskSpike > 0.3) return 'MEDIUM';
    return 'LOW';
  };

  const getPlatformEmoji = (platform: string): string => {
    return platform === 'twitter' ? 'X' : 'Air';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Social Media Monitor</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Real-time waterlogging alerts and ward risk signals.
            </p>
          </div>
          <button
            onClick={startMonitoring}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold"
          >
            {loading ? 'Loading' : 'Scan'}
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
                    {monitoringData && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Last updated: {new Date(monitoringData.timestamp).toLocaleTimeString()}
          </div>
        )}
          </div>
          {monitoringData && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {monitoringData.total_posts} posts analyzed
            </span>
          )}
        </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Scanning social media...</p>
          </div>
        )}

        {!loading && monitoringData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ward Risk Analysis */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-sm mb-3">Ward Alerts</h3>
              <div className="space-y-2">
                {Object.entries(monitoringData.ward_analysis)
                  .sort(([, a], [, b]) => b.risk_spike - a.risk_spike)
                  .slice(0, 5)
                  .map(([ward, stats]) => (
                    <div
                      key={ward}
                      onClick={() => setSelectedWard(selectedWard === ward ? null : ward)}
                      className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{ward}</span>
                            <span
                              className="text-white text-xs px-2 py-0.5 rounded-full font-bold"
                              style={{ backgroundColor: getRiskColor(stats.risk_spike) }}
                            >
                              {getRiskLabel(stats.risk_spike)}
                            </span>
                          </div>
                          <div className="flex gap-3 mt-1 text-xs text-slate-600 dark:text-slate-300">
                            <span>{stats.mention_count} mentions</span>
                            <span>Urgency {(stats.avg_urgency * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: getRiskColor(stats.risk_spike) }}>
                          {(stats.risk_spike * 100).toFixed(0)}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedWard === ward && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Sentiment:</span>
                              <span className="ml-2 font-semibold">
                                {stats.avg_sentiment > 0 ? 'Positive' : stats.avg_sentiment < 0 ? 'Negative' : 'Neutral'}
                                {' '}
                                {stats.avg_sentiment.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Risk Spike:</span>
                              <span className="ml-2 font-semibold">
                                {(stats.risk_spike * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Recent Posts */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-sm mb-3">Recent Posts</h3>
              <div className="space-y-3">
                {monitoringData.recent_posts.slice(0, 5).map((post, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getPlatformEmoji(post.platform)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-800 dark:text-slate-100 line-clamp-3 mb-1">
                          {post.text}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          {post.ward && (
                            <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
                              {post.ward}
                            </span>
                          )}
                          <span
                            className="px-2 py-0.5 rounded text-white font-semibold"
                            style={{ backgroundColor: getRiskColor(post.urgency) }}
                          >
                            Urgency {(post.urgency * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !monitoringData && !error && (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">No monitoring data available</p>
            <button
              onClick={startMonitoring}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600"
            >
              Start Monitoring
            </button>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
