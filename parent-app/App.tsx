import './global.css';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  addNotificationResponseListener,
  addNotificationReceivedListener,
  setBadgeCount,
} from './src/services/notifications';
import type { NavigationContainerRef } from '@react-navigation/native';

// Navigation ref so we can navigate from notification taps
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Foreground notification — just update badge
    notificationListener.current = addNotificationReceivedListener(() => {
      // Badge will auto-update from the notification payload
    });

    // User tapped a notification — navigate to alerts
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      if (navigationRef.current?.isReady()) {
        if (data?.type === 'sos' && data?.childId) {
          // SOS: navigate to child detail
          navigationRef.current.navigate('ChildDetail', { childId: data.childId });
        } else {
          // All other alerts: navigate to alerts tab
          navigationRef.current.navigate('MainTabs', { screen: 'Alerts' });
        }
      }

      // Clear badge after tap
      setBadgeCount(0);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator ref={navigationRef} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
