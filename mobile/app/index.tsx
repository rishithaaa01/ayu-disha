import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user?.role === 'patient') {
    return <Redirect href="/(patient)/home" />;
  }
  
  if (user?.role === 'asha') {
    return <Redirect href="/(asha)/home" />;
  }

  if (user?.role === 'doctor') {
    return <Redirect href="/(doctor)/home" />;
  }

  // Fallback
  return <Redirect href="/(patient)/home" />;
}
