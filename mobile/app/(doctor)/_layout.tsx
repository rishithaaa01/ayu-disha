import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E8EDF2',
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: '#1B6CA8',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>

      {/* Tab 1: OPD Queue */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'OPD Queue',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />

      {/* Tab 2: Profile */}
      <Tabs.Screen
        name="doctor-profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />

      {/* Hidden Transition Screens */}
      <Tabs.Screen name="patient/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="consultation/[id]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
