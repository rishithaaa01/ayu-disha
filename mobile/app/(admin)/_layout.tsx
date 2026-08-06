import { Tabs } from 'expo-router';
import { Shield, Settings } from 'lucide-react-native';

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#1B6CA8', // Ayu Disha Primary Blue
      headerShown: false, // We use custom headers in index
    }}>
      <Tabs.Screen 
        name="index" 
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <Shield color={color} size={24} />
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
