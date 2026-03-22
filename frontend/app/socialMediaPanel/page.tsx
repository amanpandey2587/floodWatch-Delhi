'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { RefreshCw, Wifi, WifiOff, TrendingUp, MessageSquare, CloudRain, AlertTriangle } from 'lucide-react';

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
  sentiment: number;
  timestamp: string;
}

interface MonitoringData {
  timestamp: string;
  total_posts: number;
  ward_analysis: Record<string, WardRisk>;
  recent_posts: SocialPost[];
}

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'X',
  telegram: 'TG',
  weather: 'WX',
};

const PLATFORM_COLOR: Record<string, string> = {
  twitter:  'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
  telegram: 'bg-blue-500 text-white',
  weather:  'bg-cyan-500 text-white',
};

function riskColor(v: number) {
  if (v > 0.7) return { bg: 'bg-red-100 dark:bg-red-950/40',   text: 'text-red-700 dark:text-red-300',   badge: 'bg-red-600 text-white',   label: 'Critical' };
  if (v > 0.5) return { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-500 text-white', label: 'High' };
  if (v > 0.3) return { bg: 'bg-yellow-100 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-500 text-white', label: 'Medium' };
  return       { bg: 'bg-green-100 dark:bg-green-950/40',   text: 'text-green-700 dark:text-green-300',   badge: 'bg-green-600 text-white',   label: 'Low' };
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SocialMediaPanel() {
  const [data, setData]           = useState<MonitoringData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');

  const fetchStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/social/monitor/status`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
        setError(null);
      } else {
        setError(json.message || 'Unknown error');
      }
    } catch (e: any) {
      setError('Cannot reach server');
    } finally {
      setLoading(false);
    }
  }, []);

  const startScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/social/monitor/start?hours_back=24`, { method: 'POST' });
      const json = await res.json();
      if (json.status === 'started') {
        // Poll for results
        setTimeout(() => { fetchStatus(); setScanning(false); }, 6000);
      } else {
        setScanning(false);
      }
    } catch (e: any) {
      setError('Scan failed');
      setScanning(false);
    }
  };

  // Auto-refresh every 5 min
  useEffect(() => {
    fetchStatus();
    const iv = setInterval(() => fetchStatus(true), 300000);
    return () => clearInterval(iv);
  }, [fetchStatus]);

  const posts = data?.recent_posts.filter(p =>
    filterPlatform === 'all' || p.platform === filterPlatform
  ) ?? [];

  const sortedWards = Object.entries(data?.ward_analysis ?? {})
    .sort(([, a], [, b]) => b.risk_spike - a.risk_spike);

  const criticalCount = sortedWards.filter(([, s]) => s.risk_spike > 0.7).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Social Intelligence</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Live flood signals from X, Telegram &amp; weather data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStatus()}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={startScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {scanning ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning...</>
              ) : (
                <><Wifi className="w-4 h-4" /> Scan Now</>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats bar */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-500">Total posts</span>
              </div>
              <div className="text-2xl font-bold">{data.total_posts}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-500">Wards affected</span>
              </div>
              <div className="text-2xl font-bold">{sortedWards.length}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-slate-500">Critical wards</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CloudRain className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-slate-500">Last scan</span>
              </div>
              <div className="text-sm font-medium">{timeAgo(data.timestamp)}</div>
            </div>
          </div>
        )}

        {/* Main content */}
        {loading && !data ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-slate-500 text-sm">Loading social signals...</p>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Ward risk panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Ward Risk Signals
              </h2>
              <div className="space-y-2">
                {sortedWards.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">No ward signals yet — click Scan Now</p>
                )}
                {sortedWards.map(([ward, stats]) => {
                  const c = riskColor(stats.risk_spike);
                  const expanded = selectedWard === ward;
                  return (
                    <div
                      key={ward}
                      onClick={() => setSelectedWard(expanded ? null : ward)}
                      className={`p-3 rounded-lg cursor-pointer border transition-all ${c.bg} border-transparent hover:border-slate-300 dark:hover:border-slate-600`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{ward}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                              {c.label}
                            </span>
                          </div>
                          <div className={`text-xs mt-0.5 ${c.text}`}>
                            {stats.mention_count} mention{stats.mention_count !== 1 ? 's' : ''} · urgency {Math.round(stats.avg_urgency * 100)}%
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${c.text}`}>
                          {Math.round(stats.risk_spike * 100)}
                        </div>
                      </div>
                      {expanded && (
                        <div className={`mt-3 pt-3 border-t border-current border-opacity-20 grid grid-cols-3 gap-2 text-xs ${c.text}`}>
                          <div><span className="opacity-70">Urgency</span><br /><strong>{Math.round(stats.avg_urgency * 100)}%</strong></div>
                          <div><span className="opacity-70">Sentiment</span><br /><strong>{stats.avg_sentiment > 0 ? '+ ' : ''}{stats.avg_sentiment.toFixed(2)}</strong></div>
                          <div><span className="opacity-70">Risk score</span><br /><strong>{Math.round(stats.risk_spike * 100)}</strong></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent posts panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Live Posts
                </h2>
                {/* Platform filter */}
                <div className="flex gap-1">
                  {['all', 'twitter', 'telegram', 'weather'].map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPlatform(p)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        filterPlatform === p
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p === 'all' ? 'All' : PLATFORM_LABEL[p] || p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {posts.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">No posts for this filter</p>
                )}
                {posts.map((post, i) => {
                  const c = riskColor(post.urgency);
                  return (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-start gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${PLATFORM_COLOR[post.platform] || 'bg-slate-200 text-slate-700'}`}>
                          {PLATFORM_LABEL[post.platform] || post.platform}
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed flex-1">
                          {post.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {post.ward && post.ward !== 'Unknown' && (
                          <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            {post.ward}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                          {Math.round(post.urgency * 100)}% urgency
                        </span>
                        <span className="text-xs text-slate-400 ml-auto">
                          {timeAgo(post.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-16">
            <Wifi className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="text-slate-500 text-sm mb-4">No data yet</p>
            <button
              onClick={startScan}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Start Scanning
            </button>
          </div>
        )}

      </div>
    </div>
  );
}