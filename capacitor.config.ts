import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.za.nannygold.app',
  appName: 'NannyGold',
  webDir: 'dist',
  
  // Server config for live reload during development
  // Uncomment and set your local IP for dev:
  // server: {
  //   url: 'http://192.168.x.x:5173',
  //   cleartext: true,
  // },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#D946EF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#D946EF',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  // iOS specific
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'NannyGold',
    backgroundColor: '#ffffff',
  },

  // Android specific
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set true for debug builds
  },
};

export default config;
