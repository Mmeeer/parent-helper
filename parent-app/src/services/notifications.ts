import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import * as api from './api';

// --- FCM registration health tracking ---
let _pushHealthy = true;
let _retryScheduled = false;
let _appStateSubscription: { remove(): void } | null = null;
let _tokenRefreshUnsubscribe: (() => void) | null = null;

/**
 * Minimal shape of the `@react-native-firebase/messaging` module instance we use.
 * Loaded lazily (iOS only) so the Android path is unchanged and the app still
 * runs when the native module is unavailable (e.g. Expo Go).
 */
type FirebaseMessagingInstance = {
  registerDeviceForRemoteMessages(): Promise<void>;
  getToken(): Promise<string>;
  deleteToken(): Promise<void>;
  onTokenRefresh(listener: (token: string) => void): () => void;
};

function getFirebaseMessaging(): FirebaseMessagingInstance | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/messaging');
    const factory = (mod?.default ?? mod) as (() => FirebaseMessagingInstance) | undefined;
    return typeof factory === 'function' ? factory() : null;
  } catch (err) {
    console.warn('[Notifications] @react-native-firebase/messaging unavailable:', err);
    return null;
  }
}

/**
 * Resolve the platform push token the backend can deliver to through FCM.
 * - iOS: FCM registration token via RN Firebase (raw APNs tokens from
 *   `getDevicePushTokenAsync` are rejected by FCM `sendEachForMulticast`).
 * - Android: native FCM token from expo-notifications.
 */
async function getPlatformPushToken(): Promise<string> {
  if (Platform.OS === 'ios') {
    const messaging = getFirebaseMessaging();
    if (messaging) {
      // Safe to call repeatedly; no-op when auto-registration is enabled.
      await messaging.registerDeviceForRemoteMessages();
      return messaging.getToken();
    }
    console.warn('[Notifications] Falling back to raw APNs token on iOS');
  }
  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data;
}

/**
 * On iOS, FCM tokens can rotate. Re-register with the backend when that happens.
 */
function subscribeToTokenRefresh() {
  if (_tokenRefreshUnsubscribe) return;
  const messaging = getFirebaseMessaging();
  if (!messaging) return;
  try {
    _tokenRefreshUnsubscribe = messaging.onTokenRefresh((token) => {
      api.registerFcmToken(token, 'ios')
        .then(() => {
          _pushHealthy = true;
          console.log('[Notifications] Re-registered refreshed FCM token');
        })
        .catch((err) => {
          _pushHealthy = false;
          console.error('[Notifications] Token refresh registration failed:', err);
          scheduleRetryOnResume();
        });
    });
  } catch (err) {
    console.warn('[Notifications] onTokenRefresh subscription failed:', err);
  }
}

export function isPushRegistrationHealthy(): boolean {
  return _pushHealthy;
}

function scheduleRetryOnResume() {
  if (_retryScheduled) return;
  _retryScheduled = true;

  const handleChange = (next: AppStateStatus) => {
    if (next === 'active') {
      _retryScheduled = false;
      _appStateSubscription?.remove();
      _appStateSubscription = null;
      console.log('[Notifications] Retrying FCM registration on app resume');
      registerForPushNotifications();
    }
  };

  _appStateSubscription = AppState.addEventListener('change', handleChange);
}

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isSos = data?.type === 'sos';
    return {
      shouldShowAlert: true,   // legacy (SDK < 53 / Android)
      shouldShowBanner: true,  // iOS 14+ (expo-notifications 0.31 / SDK 53)
      shouldShowList: true,
      shouldPlaySound: isSos,
      shouldSetBadge: true,
    };
  },
});

/**
 * Register for push notifications and send the FCM token to the backend.
 * Returns the Expo push token string, or null if registration fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  // Check/request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Set up Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('general_alerts', {
      name: 'General Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('sos_alerts', {
      name: 'SOS Emergency',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      sound: 'default',
      enableVibrate: true,
    });
  }

  try {
    // Get the FCM token (RN Firebase on iOS, native device token on Android)
    const fcmToken = await getPlatformPushToken();

    // Send to backend
    await api.registerFcmToken(fcmToken, Platform.OS as 'ios' | 'android');

    _pushHealthy = true;
    console.log('[Notifications] Registered FCM token');
    subscribeToTokenRefresh();
    return fcmToken;
  } catch (err) {
    _pushHealthy = false;
    console.error('[Notifications] Registration failed:', err);
    scheduleRetryOnResume();
    return null;
  }
}

/**
 * Remove push token from backend (call on logout).
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const token = await getPlatformPushToken();
    await api.removeFcmToken(token);
  } catch {
    // Ignore — best effort on logout
  } finally {
    _tokenRefreshUnsubscribe?.();
    _tokenRefreshUnsubscribe = null;
  }
}

/**
 * Add a listener for when user taps a notification.
 * Returns an unsubscribe function.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Add a listener for notifications received while app is foregrounded.
 * Returns an unsubscribe function.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Get badge count.
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
