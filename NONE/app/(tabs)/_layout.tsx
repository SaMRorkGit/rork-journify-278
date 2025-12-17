import { Tabs } from 'expo-router';
import { BookText, CheckSquare, Lightbulb, Target, User } from 'lucide-react-native';
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
          tabBarIcon: ({ color }) => <CheckSquare size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: 'Action',
          tabBarIcon: ({ color }) => <Target size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <BookText size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <Lightbulb size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
