import { Tabs } from 'expo-router';
import { Home, Settings } from 'lucide-react-native';

export default function LabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0d9488', // Teal
      headerShown: false,
    }}>
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Lab Orders',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />
        }} 
      />
    </Tabs>
  );
}
