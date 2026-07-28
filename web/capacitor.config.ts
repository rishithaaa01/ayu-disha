import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ayudisha.app',
  appName: 'Ayu Disha',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true // Allow HTTP for local development
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1B6CA8",
      showSpinner: false
    }
  }
};

export default config;
