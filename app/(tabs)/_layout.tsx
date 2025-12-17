import { Tabs } from 'expo-router';
import React from 'react';
import { BookOpenText, Lightbulb, Target, User, CheckCircle2 } from 'lucide-react-native';
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
          tabBarIcon: ({ color, focused }) => (
            <CheckCircle2
              size={24}
              color={color}
              strokeWidth={focused ? 2.6 : 2.2}
              testID="tab-icon-today"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: 'Action',
          tabBarIcon: ({ color, focused }) => (
            <Target
              size={24}
              color={color}
              strokeWidth={focused ? 2.6 : 2.2}
              testID="tab-icon-action"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, focused }) => (
            <BookOpenText
              size={24}
              color={color}
              strokeWidth={focused ? 2.6 : 2.2}
              testID="tab-icon-journal"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <Lightbulb
              size={24}
              color={color}
              strokeWidth={focused ? 2.6 : 2.2}
              testID="tab-icon-progress"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User
              size={24}
              color={color}
              strokeWidth={focused ? 2.6 : 2.2}
              testID="tab-icon-profile"
            />
          ),
        }}
      />
    </Tabs>
  );
}
