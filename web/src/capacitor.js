import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

export const initializeCapacitor = async () => {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    console.log('Running on native platform:', Capacitor.getPlatform());
    
    // Configure Status Bar
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#1B6CA8' });
    } catch (err) {
      console.warn('StatusBar configuration failed:', err);
    }
    
    // Hide splash screen after app is ready
    try {
      await SplashScreen.hide();
    } catch (err) {
      console.warn('SplashScreen hide failed:', err);
    }
    
    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
    });
    
    // Handle back button
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  } else {
    console.log('Running in web browser');
  }
  
  return isNative;
};

export const isNativeApp = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
