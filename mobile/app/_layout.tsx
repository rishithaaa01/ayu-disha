import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, LogBox } from 'react-native';
import { syncService } from '../services/syncService';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Disable development error overlays and warnings in production-like mode
if (!__DEV__) {
  console.error = () => {};
  console.warn = () => {};
}

// Ignore specific warnings that don't affect user experience
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'AsyncStorage has been extracted',
  'Require cycle:',
  'VirtualizedLists should never be nested',
]);

// Disable all yellow box warnings
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    // Wrap in try-catch to prevent errors from showing to users
    try {
      restoreSession();
      syncService.startSyncListener();
    } catch (error) {
      console.log('Initialization error:', error);
    }
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1B6CA8" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
