import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import Colors from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tealMain,
        tabBarInactiveTintColor: Colors.textSoft,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.glassBg,
          borderTopWidth: 1,
          borderTopColor: Colors.glassBorder,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Ionicons name="checkbox-outline" size={24} color={color} />
,
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: 'Action',
          tabBarIcon: ({ color }) => <Ionicons name="target-outline" size={24} color={color} />
,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <Ionicons name="book-outline" size={24} color={color} />
,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <Ionicons name="bulb-outline" size={24} color={color} />
,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />
,
        }}
      />
    </Tabs>
  );
}
