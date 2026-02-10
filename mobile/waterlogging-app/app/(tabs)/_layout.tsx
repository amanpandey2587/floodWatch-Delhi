import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Home, Map, MessageSquare, Activity, Car, Shield, ClipboardList, Radar } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'ward_officer' || user?.role === 'ward_admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Map size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="parking"
        options={{
          title: 'Parking',
          tabBarIcon: ({ color }) => <Car size={28} color={color} />,
        }}
      />
      {!isAdmin && (
        <>
          <Tabs.Screen
            name="report"
            options={{
              title: 'Report',
              tabBarIcon: ({ color }) => <MessageSquare size={28} color={color} />,
            }}
          />
          <Tabs.Screen
            name="status"
            options={{
              title: 'Status',
              tabBarIcon: ({ color }) => <Activity size={28} color={color} />,
            }}
          />
        </>
      )}
      {isAdmin && (
        <>
          <Tabs.Screen
            name="admin"
            options={{
              title: 'Admin',
              tabBarIcon: ({ color }) => <Shield size={26} color={color} />,
            }}
          />
          <Tabs.Screen
            name="resolve"
            options={{
              title: 'Resolve',
              tabBarIcon: ({ color }) => <ClipboardList size={26} color={color} />,
            }}
          />
          <Tabs.Screen
            name="social"
            options={{
              title: 'Social',
              tabBarIcon: ({ color }) => <Radar size={26} color={color} />,
            }}
          />
        </>
      )}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
