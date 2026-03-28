import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as api from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isSos = data?.type === 'sos';
    return {
      shouldShowAlert: true,
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
    // Get the FCM token (native device token for Firebase)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data;

    // Send to backend
    await api.registerFcmToken(fcmToken, Platform.OS as 'ios' | 'android');

    console.log('[Notifications] Registered FCM token');
    return fcmToken;
  } catch (err) {
    console.error('[Notifications] Registration failed:', err);
    return null;
  }
}

/**
 * Remove push token from backend (call on logout).
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    await api.removeFcmToken(tokenData.data);
  } catch {
    // Ignore — best effort on logout
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
