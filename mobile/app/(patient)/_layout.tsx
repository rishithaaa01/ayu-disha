import React from 'react';
import { Tabs } from 'expo-router';
// Using standard expo vector icons
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export default function PatientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#F7F3EE',
          height: 60,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#1B6CA8',
        tabBarInactiveTintColor: '#6B6B6B',
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
          fontWeight: '500',
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          tabBarLabel: 'Records',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="folder-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          tabBarLabel: 'Medicines',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tests"
        options={{
          tabBarLabel: 'Tests',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="flask" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="consents"
        options={{
          href: null, // Hide from tab bar
          title: "My Consents"
        }}
      />
    </Tabs>
  );
}
