import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AshaLayout() {
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

      {/* Tab 1: Home Dashboard */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      {/* Tab 2: Village (household list) */}
      <Tabs.Screen
        name="village"
        options={{
          title: 'Village',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />

      {/* Tab 3: Referrals */}
      <Tabs.Screen
        name="referrals"
        options={{
          title: 'Referrals',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="arrow-forward-circle" size={size} color={color} />,
        }}
      />

      {/* Tab 4: Profile */}
      <Tabs.Screen
        name="asha-profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />

      {/* Hidden screens (navigated to programmatically, not shown as tabs) */}
      <Tabs.Screen name="household" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="referral-flow" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="add-household" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="visit-flow" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
