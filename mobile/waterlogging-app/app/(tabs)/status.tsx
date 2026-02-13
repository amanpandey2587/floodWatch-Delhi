import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, AlertCircle, CheckCircle, XCircle, MapPin, Loader, RefreshCw } from 'lucide-react-native';
import { API_BASE_URL } from '@/lib/config';
import { getErrorMessage } from '@/lib/utils';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'expo-router';

interface Complaint {
    complaint_id: string;
    title: string;
    description: string;
    category: string;
    ward_number: number;
    status: string;
    priority: string;
    created_at: string;
    water_depth?: string;
    user_id?: string;
    created_by?: string;
    reported_by?: string;
    created_by_user_id?: string;
    citizen_id?: string;
    reported_by_id?: string;
    user?: {
        user_id?: string;
        id?: string;
    };
    sla_info?: {
        elapsed_hours: number;
        remaining_hours: number;
        sla_status: string;
        sla_percentage: number;
    };
}

export default function StatusScreen() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { authHeaders, user } = useAuth();
    const router = useRouter();

    const getComplaintOwnerId = (complaint: Complaint) => {
        return (
            complaint.user_id ||
            complaint.created_by ||
            complaint.reported_by ||
            complaint.created_by_user_id ||
            complaint.citizen_id ||
            complaint.reported_by_id ||
            complaint.user?.user_id ||
            complaint.user?.id
        );
    };

    const fetchComplaints = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/complaints`, {
                headers: authHeaders(),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch complaints');
            }

            const data = await response.json();
            const list: Complaint[] = data.complaints || data || [];
            const currentUserId = user?.user_id;

            if (!currentUserId) {
                setComplaints([]);
                setError('User session not found');
                return;
            }

            const filteredComplaints = list.filter((complaint) => {
                const ownerId = getComplaintOwnerId(complaint);
                return ownerId ? String(ownerId) === String(currentUserId) : false;
            });

            setComplaints(filteredComplaints);
            setError(null);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, [user?.user_id]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchComplaints();
    }, [user?.user_id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100/50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-600 dark:text-yellow-500';
            case 'acknowledged': return 'bg-blue-100/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-500';
            case 'in_progress': return 'bg-orange-100/50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-500';
            case 'resolved': return 'bg-green-100/50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-600 dark:text-green-500';
            case 'closed': return 'bg-gray-100/50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/30 text-gray-600 dark:text-gray-500';
            default: return 'bg-gray-100/50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/30 text-gray-600 dark:text-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock size={14} color="#eab308" />;
            case 'acknowledged': return <AlertCircle size={14} color="#3b82f6" />;
            case 'in_progress': return <Loader size={14} color="#f97316" />;
            case 'resolved': return <CheckCircle size={14} color="#22c55e" />;
            case 'closed': return <XCircle size={14} color="#6b7280" />;
            default: return <Clock size={14} color="#6b7280" />;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const renderItem = ({ item }: { item: Complaint }) => {
        const getTimeAgo = () => {
            const now = new Date();
            const created = new Date(item.created_at);
            const diffMs = now.getTime() - created.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (diffHours > 0) return `${diffHours}h ${diffMins}m ago`;
            return `${diffMins}m ago`;
        };

        const getSLAColor = (status: string) => {
            switch (status) {
                case 'within_sla': return '#22c55e';
                case 'approaching_sla': return '#eab308';
                case 'sla_breached': return '#ef4444';
                default: return '#6b7280';
            }
        };

        return (
            <TouchableOpacity
                onPress={() => router.push(`/(tabs)/status/${item.complaint_id}`)}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-4 shadow-sm"
            >
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-4">
                        <Text className="text-gray-900 dark:text-white font-bold text-lg mb-1">{item.title}</Text>
                        <Text className="text-gray-600 dark:text-slate-400 text-sm line-clamp-2 mb-2">{item.description}</Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full border flex-row items-center gap-1 ${getStatusColor(item.status).split(' ').slice(0, 3).join(' ')}`}>
                        {getStatusIcon(item.status)}
                        <Text className={`text-xs font-bold uppercase ${getStatusColor(item.status).split(' ').slice(3).join(' ')}`}>
                            {item.status.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                <View className="flex-row items-center gap-4 border-t border-gray-100 dark:border-slate-800/50 pt-3">
                    <View className="flex-row items-center gap-1">
                        <MapPin size={12} color={isDark ? '#64748b' : '#94a3b8'} />
                        <Text className="text-gray-500 dark:text-slate-500 text-xs">Ward {item.ward_number}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <Clock size={12} color={isDark ? '#64748b' : '#94a3b8'} />
                        <Text className="text-gray-500 dark:text-slate-500 text-xs">{formatDate(item.created_at)}</Text>
                    </View>
                    <Text className="text-gray-500 dark:text-slate-500 text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded capitalize">{item.category}</Text>
                </View>

                {item.sla_info && (
                    <View className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-800">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Clock size={14} color={getSLAColor(item.sla_info.sla_status)} />
                                <Text className="text-gray-600 dark:text-slate-400 text-xs ml-2">
                                    Reported {getTimeAgo()}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <Text className="text-xs font-bold mr-1" style={{ color: getSLAColor(item.sla_info.sla_status) }}>
                                    {item.status !== 'resolved'
                                        ? `${item.sla_info.remaining_hours.toFixed(0)}h remaining`
                                        : item.sla_info.sla_status === 'met' ? 'SLA Met' : 'SLA Breached'
                                    }
                                </Text>
                            </View>
                        </View>
                        <View className="mt-2 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <View
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.min(100, item.sla_info.sla_percentage)}%`,
                                    backgroundColor: getSLAColor(item.sla_info.sla_status)
                                }}
                            />
                        </View>
                    </View>
                )}

                {item.water_depth && (
                    <View className="mt-2 flex-row items-center">
                        <Text className="text-xs text-gray-500 dark:text-slate-400 mr-2">Water:</Text>
                        <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">{item.water_depth}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
            <View className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50 flex-row justify-between items-center">
                <Text className="text-gray-900 dark:text-white text-xl font-bold">Complaint Status</Text>
                <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                    {refreshing ? <ActivityIndicator size="small" color="#06b6d4" /> : <RefreshCw size={20} color="#06b6d4" />}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#06b6d4" />
                    <Text className="text-gray-500 dark:text-slate-500 mt-4">Loading complaints...</Text>
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center p-6">
                    <AlertCircle size={48} color="#ef4444" className="mb-4" />
                    <Text className="text-red-500 dark:text-red-400 text-center text-lg mb-2">Error</Text>
                    <Text className="text-gray-500 dark:text-slate-500 text-center">{error}</Text>
                    <TouchableOpacity onPress={fetchComplaints} className="mt-6 bg-gray-800 dark:bg-slate-800 px-6 py-3 rounded-lg">
                        <Text className="text-white">Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={complaints}
                    renderItem={renderItem}
                    keyExtractor={item => item.complaint_id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Text className="text-gray-500 dark:text-slate-500">No complaints found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
