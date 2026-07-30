import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

export const initializeCapacitor = async () => {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    console.log('Running on native platform:', Capacitor.getPlatform());
    
    // Configure Status Bar for transparent overlay and light icons
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Light });
    } catch (err) {
      console.warn('StatusBar configuration notice:', err);
    }
    
    // Hide splash screen after app is ready
    try {
      await SplashScreen.hide();
    } catch (err) {
      console.warn('SplashScreen hide notice:', err);
    }
    
    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
    });
    
    // Handle Android hardware back button
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack || window.location.pathname === '/' || window.location.pathname === '/login') {
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
