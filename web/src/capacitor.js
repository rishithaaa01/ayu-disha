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
    
    // Handle Android hardware back button under HashRouter
    App.addListener('backButton', ({ canGoBack }) => {
      const hash = window.location.hash || '';
      const isAtLoginOrRoot = !hash || hash === '#/' || hash === '#/login' || hash === '#/login/';
      console.log('📱 [RUNTIME DEBUG] Capacitor backButton listener fired!', {
        pathname: window.location.pathname,
        hash,
        canGoBack,
        isAtLoginOrRoot
      });
      if (!canGoBack || isAtLoginOrRoot) {
        console.warn('📱 [RUNTIME DEBUG] Exiting app because hash is at root or /login! Hash:', hash);
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
