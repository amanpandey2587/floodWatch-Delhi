'use client';

import { TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';

interface Stats {
  total_complaints: number;
  pending: number;
  acknowledged: number;
  in_progress: number;
  resolved: number;
  high_priority: number;
  avg_response_time: number | null;
  satisfaction_rate: number | null;
}

interface AdminStatsProps {
  stats: Stats;
}

export default function AdminStats({ stats }: AdminStatsProps) {
  const statCards = [
    {
      title: 'Total Complaints',
      value: stats.total_complaints,
      icon: BarChart3,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
    },
    {
      title: 'In Progress',
      value: stats.in_progress,
      icon: TrendingUp,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      title: 'High Priority',
      value: stats.high_priority,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {statCards.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`${stat.bgColor} rounded-lg p-6 border border-gray-200`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-8 h-8 ${stat.color} text-white rounded-lg p-1.5`} />
            </div>
            <div className={`text-3xl font-bold ${stat.textColor} mb-1`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">{stat.title}</div>
          </div>
        );
      })}
    </div>
  );
}
