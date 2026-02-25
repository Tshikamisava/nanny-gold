/**
 * Native Platform Integration
 * Initializes Capacitor plugins and provides platform-aware utilities
 * for the NannyGold mobile app (Android & iOS).
 */
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';

/** True when running inside a native shell (not the browser) */
export const isNativePlatform = Capacitor.isNativePlatform();
export const currentPlatform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

/**
 * Called once from main.tsx after the React app mounts.
 * Sets up all native-only behaviour.
 */
export async function initializeNativePlatform() {
  if (!isNativePlatform) return;

  // ── Status Bar ──────────────────────────────────
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#D946EF' });
    if (currentPlatform === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) {
    console.warn('StatusBar plugin error:', e);
  }

  // ── Splash Screen ──────────────────────────────
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen plugin error:', e);
  }

  // ── Keyboard ───────────────────────────────────
  try {
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });
  } catch (e) {
    console.warn('Keyboard plugin error:', e);
  }

  // ── Hardware Back Button (Android) ─────────────
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch (e) {
    console.warn('App back-button listener error:', e);
  }

  // ── Deep Links ─────────────────────────────────
  try {
    CapApp.addListener('appUrlOpen', (event) => {
      // Handle deep links like nannygold://booking/123
      const slug = event.url.split('.app').pop();
      if (slug) {
        window.location.href = slug;
      }
    });
  } catch (e) {
    console.warn('Deep link listener error:', e);
  }
}

/**
 * Request push notification permissions and register for tokens.
 * Call this after user has logged in (not at app startup).
 */
export async function registerPushNotifications(
  onTokenReceived: (token: string) => void
) {
  if (!isNativePlatform) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('Push token:', token.value);
      onTokenReceived(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
      // Navigate to relevant page based on notification data
      const data = action.notification.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });
  } catch (e) {
    console.error('Push notification setup error:', e);
  }
}
