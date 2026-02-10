import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, MapPin, X, Upload, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/lib/config';
import { getErrorMessage } from '@/lib/utils';
import { useColorScheme } from 'nativewind';

export default function ReportScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Waterlogging',
        ward_number: '44',
        priority: 'medium',
        location: null as { latitude: number; longitude: number } | null,
        water_depth: null as string | null,
    });

    const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 5 - images.length,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImages([...images, ...result.assets]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Sorry, we need camera permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImages([...images, ...result.assets]);
        }
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Permission to access location was denied');
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setFormData({
            ...formData,
            location: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            }
        });
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.description) {
            Alert.alert('Missing Fields', 'Please fill in the title and description.');
            return;
        }

        setLoading(true);

        try {
            const attachments = images.map(img => `data:${img.mimeType};base64,${img.base64}`);

            const payload = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                ward_number: parseInt(formData.ward_number) || 44,
                priority: formData.priority,
                location: formData.location || { latitude: 28.6139, longitude: 77.2090 }, // Default to Delhi if no loc
                attachments: attachments,
                water_depth: formData.water_depth,
            };

            console.log('Submitting payload:', JSON.stringify(payload).substring(0, 200) + '...');

            const response = await fetch(`${API_BASE_URL}/api/complaints`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit complaint');
            }

            const result = await response.json();
            console.log('Complaint submitted:', result);

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setFormData({
                    title: '',
                    description: '',
                    category: 'Waterlogging',
                    ward_number: '44',
                    priority: 'medium',
                    location: null,
                    water_depth: null,
                });
                setImages([]);
                router.push('/(tabs)/status');
            }, 2000);

        } catch (error: any) {
            console.error('Submission error:', error);
            Alert.alert('Error', getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 items-center justify-center p-6">
                <View className="bg-green-100 dark:bg-green-500/10 p-8 rounded-full mb-6 border border-green-200 dark:border-green-500/50">
                    <CheckCircle size={64} color="#22c55e" />
                </View>
                <Text className="text-gray-900 dark:text-white text-2xl font-bold mb-2 text-center">Reference ID generated !</Text>
                <Text className="text-gray-500 dark:text-slate-400 text-center">Your complaint has been successfully filed. We are notifying the authorities.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
            <View className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
                <Text className="text-gray-900 dark:text-white text-xl font-bold">File Complaint</Text>
            </View>

            <ScrollView className="flex-1 p-6">
                {/* Title */}
                <View className="mb-6">
                    <Text className="text-gray-500 dark:text-slate-400 text-sm font-bold mb-2 uppercase">Title</Text>
                    <TextInput
                        className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-white p-4 rounded-xl"
                        placeholder="e.g. Waterlogging at Connaught Place"
                        placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                        value={formData.title}
                        onChangeText={t => setFormData({ ...formData, title: t })}
                    />
                </View>

                {/* Description */}
                <View className="mb-6">
                    <Text className="text-gray-500 dark:text-slate-400 text-sm font-bold mb-2 uppercase">Description</Text>
                    <TextInput
                        className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-white p-4 rounded-xl min-h-[120px]"
                        placeholder="Describe the issue in detail..."
                        placeholderTextColor={isDark ? "#64748b" : "#9ca3af"}
                        multiline
                        textAlignVertical="top"
                        value={formData.description}
                        onChangeText={t => setFormData({ ...formData, description: t })}
                    />
                </View>

                {/* Category & Ward */}
                <View className="flex-row gap-4 mb-6">
                    <View className="flex-1">
                        <Text className="text-gray-500 dark:text-slate-400 text-sm font-bold mb-2 uppercase">Category</Text>
                        <View className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-xl overflow-hidden">
                            {/* Simplified Select via TextInput or Modal - doing TextInput for speed */}
                            <TextInput
                                className="text-gray-900 dark:text-white p-4"
                                value={formData.category} // Editable for now or stick to default
                                editable={false}
                            />
                        </View>
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-500 dark:text-slate-400 text-sm font-bold mb-2 uppercase">Ward No.</Text>
                        <TextInput
                            className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 text-gray-900 dark:text-white p-4 rounded-xl"
                            value={formData.ward_number}
                            keyboardType="numeric"
                            onChangeText={t => setFormData({ ...formData, ward_number: t })}
                        />
                    </View>
                </View>

                {/* Water Depth */}
                <View className="mb-6">
                    <Text className="text-gray-500 dark:text-slate-400 text-sm font-bold mb-2 uppercase">Water Depth (Optional)</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {[
                            { label: 'Ankle Deep', value: 'Ankle Deep', emoji: '🦶', color: '#60a5fa' },
                            { label: 'Knee Deep', value: 'Knee Deep', emoji: '🦵', color: '#3b82f6' },
                            { label: 'Tyre Deep', value: 'Tyre Deep', emoji: '🚗', color: '#f59e0b' },
                            { label: 'Hood Deep', value: 'Hood Deep', emoji: '🚙', color: '#f97316' },
                            { label: 'Fully Submerged', value: 'Fully Submerged', emoji: '🌊', color: '#ef4444' },
                        ].map((depth) => (
                            <TouchableOpacity
                                key={depth.value}
                                onPress={() => setFormData({ ...formData, water_depth: depth.value })}
                                className={`flex-row items-center px-4 py-3 rounded-xl border-2 ${formData.water_depth === depth.value
                                    ? 'bg-blue-100/50 dark:bg-blue-500/20 border-blue-500'
                                    : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                                    }`}
                                style={{ minWidth: '48%' }}
                            >
                                <Text className="text-xl mr-2">{depth.emoji}</Text>
                                <Text className={`font-semibold ${formData.water_depth === depth.value
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-slate-300'
                                    }`}>{depth.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Location */}
                <View className="mb-6">
                    <Text className="text-gray-500 dark:text-slate-400 text-sm font-bold mb-2 uppercase">Location</Text>
                    <TouchableOpacity
                        className={`flex-row items-center justify-center p-4 rounded-xl border ${formData.location ? 'bg-green-100/50 dark:bg-green-500/10 border-green-500/30' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}
                        onPress={getLocation}
                    >
                        <MapPin size={20} color={formData.location ? '#22c55e' : (isDark ? '#94a3b8' : '#64748b')} className="mr-2" />
                        <Text className={formData.location ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-500 dark:text-slate-300 font-bold'}>
                            {formData.location ? `Lat: ${formData.location.latitude.toFixed(4)}, Lng: ${formData.location.longitude.toFixed(4)}` : 'Detect Current Location'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Images */}
                <View className="mb-8">
                    <Text className="text-gray-500 dark:text-slate-400 text-sm font-bold mb-2 uppercase">Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row" contentContainerStyle={{ gap: 16 }}>
                        <TouchableOpacity
                            className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-xl items-center justify-center border border-gray-200 dark:border-slate-700 border-dashed"
                            onPress={takePhoto}
                        >
                            <Camera size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                            <Text className="text-gray-500 dark:text-slate-500 text-xs mt-1">Camera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-xl items-center justify-center border border-gray-200 dark:border-slate-700 border-dashed"
                            onPress={pickImage}
                        >
                            <Upload size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                            <Text className="text-gray-500 dark:text-slate-500 text-xs mt-1">Gallery</Text>
                        </TouchableOpacity>

                        {images.map((img, idx) => (
                            <View key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                                <Image source={{ uri: img.uri }} className="w-full h-full" />
                                <TouchableOpacity
                                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                                    onPress={() => removeImage(idx)}
                                >
                                    <X size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    className={`mb-10 p-5 rounded-2xl items-center shadow-lg ${loading ? 'bg-gray-400 dark:bg-slate-700' : 'bg-cyan-600 dark:bg-cyan-700 shadow-cyan-500/20'}`}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Submit Complaint</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}
