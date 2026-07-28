import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Role-based routing matching web implementation
  switch (user?.role) {
    case 'patient':
      return <Redirect href="/(patient)/home" />;
    
    case 'asha':
      return <Redirect href="/(asha)/home" />;
    
    case 'doctor':
      return <Redirect href="/(doctor)/home" />;
    
    case 'admin':
      return <Redirect href="/(admin)/home" />;
    
    case 'pho':
      return <Redirect href="/(pho)/home" />;
    
    case 'lab':
      return <Redirect href="/(lab)/home" />;
    
    default:
      // Unknown role - redirect to auth for security
      console.warn(`Unknown role: ${user?.role}`);
      return <Redirect href="/(auth)/welcome" />;
  }
}
