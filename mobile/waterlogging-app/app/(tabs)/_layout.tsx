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
  const { user, isLoading } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'admin' || role === 'ward_officer' || role === 'ward_admin';
  const isCitizen = role === 'citizen';
  const showAdminTabs = !isLoading && isAdmin;
  const showCitizenTabs = !isLoading && isCitizen;

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
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          href: showCitizenTabs ? undefined : null,
          tabBarIcon: ({ color }) => <MessageSquare size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          href: showCitizenTabs ? undefined : null,
          tabBarIcon: ({ color }) => <Activity size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: showAdminTabs ? undefined : null,
          tabBarIcon: ({ color }) => <Shield size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          href: showAdminTabs ? undefined : null,
          tabBarIcon: ({ color }) => <Radar size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="resolve"
        options={{
          title: 'Resolve',
          href: showAdminTabs ? undefined : null,
          tabBarIcon: ({ color }) => <ClipboardList size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="status/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="resolve/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
