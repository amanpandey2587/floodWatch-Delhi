'use client';

import { useState, useEffect } from 'react';

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
      const response = await fetch('http://localhost:8000/api/social/monitor/status');
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
        'http://localhost:8000/api/social/monitor/start?hours_back=24',
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
    return platform === 'twitter' ? '🐦' : '✈️';
  };

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg max-w-md max-h-[70vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">📱 Social Media Monitor</h2>
            <p className="text-xs opacity-90">Real-time waterlogging alerts</p>
          </div>
          <button
            onClick={startMonitoring}
            disabled={loading}
            className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? '⏳' : '🔄'} Scan
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoRefresh" className="text-xs text-gray-600">
            Auto-refresh
          </label>
        </div>
        {monitoringData && (
          <span className="text-xs text-gray-500">
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
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Scanning social media...</p>
          </div>
        )}

        {!loading && monitoringData && (
          <>
            {/* Ward Risk Analysis */}
            <div className="mb-4">
              <h3 className="font-bold text-sm mb-2">🎯 Ward Alerts</h3>
              <div className="space-y-2">
                {Object.entries(monitoringData.ward_analysis)
                  .sort(([, a], [, b]) => b.risk_spike - a.risk_spike)
                  .slice(0, 5)
                  .map(([ward, stats]) => (
                    <div
                      key={ward}
                      onClick={() => setSelectedWard(selectedWard === ward ? null : ward)}
                      className="bg-gray-50 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
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
                          <div className="flex gap-3 mt-1 text-xs text-gray-600">
                            <span>📊 {stats.mention_count} mentions</span>
                            <span>⚡ {(stats.avg_urgency * 100).toFixed(0)}% urgent</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: getRiskColor(stats.risk_spike) }}>
                          {(stats.risk_spike * 100).toFixed(0)}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedWard === ward && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">Sentiment:</span>
                              <span className="ml-2 font-semibold">
                                {stats.avg_sentiment > 0 ? '😊' : stats.avg_sentiment < 0 ? '😟' : '😐'}
                                {' '}
                                {stats.avg_sentiment.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Risk Spike:</span>
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
            <div>
              <h3 className="font-bold text-sm mb-2">💬 Recent Posts</h3>
              <div className="space-y-2">
                {monitoringData.recent_posts.slice(0, 5).map((post, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getPlatformEmoji(post.platform)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 line-clamp-3 mb-1">
                          {post.text}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {post.ward && (
                            <span className="bg-white px-2 py-0.5 rounded">
                              📍 {post.ward}
                            </span>
                          )}
                          <span
                            className="px-2 py-0.5 rounded text-white font-semibold"
                            style={{ backgroundColor: getRiskColor(post.urgency) }}
                          >
                            ⚡ {(post.urgency * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !monitoringData && !error && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-3">No monitoring data available</p>
            <button
              onClick={startMonitoring}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600"
            >
              Start Monitoring
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {monitoringData && (
        <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
          Last updated: {new Date(monitoringData.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}