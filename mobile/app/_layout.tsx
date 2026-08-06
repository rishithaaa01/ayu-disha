import '../global.css';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AuthGuard() {
  const { isAuthenticated, isHydrated, hydrate, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  useEffect(() => {
    console.log('[AuthGuard] isHydrated:', isHydrated, 'rootKey:', rootNavigationState?.key, 'isAuthenticated:', isAuthenticated, 'segments:', segments);
    
    if (!isHydrated || !rootNavigationState?.key) {
      console.log('[AuthGuard] Waiting... isHydrated:', isHydrated, 'rootKey:', !!rootNavigationState?.key);
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log('[AuthGuard] Ready to route. inAuthGroup:', inAuthGroup, 'segment0:', segments[0]);
    
    if (!isAuthenticated && !inAuthGroup) {
      console.log('[AuthGuard] Redirecting to login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated) {
      // If they are authenticated but on the login screen, OR on the root loading screen, redirect them!
      if (inAuthGroup || !segments.length) {
        console.log('[AuthGuard] Redirecting to role:', user?.role);
        if (user?.role === 'doctor') {
          router.replace('/(doctor)');
        } else if (user?.role === 'patient') {
          router.replace('/(patient)');
        } else if (user?.role === 'lab') {
          router.replace('/(lab)');
        } else if (user?.role === 'admin') {
          router.replace('/(admin)');
        } else {
          // fallback if role is missing
          router.replace('/(doctor)');
        }
      }
    }
  }, [isAuthenticated, isHydrated, segments, user, rootNavigationState?.key]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
