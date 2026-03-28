import './global.css';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import {
  addNotificationResponseListener,
  addNotificationReceivedListener,
  setBadgeCount,
} from './src/services/notifications';
import {
  useFonts,
  CormorantGaramond_700Bold_Italic,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_400Regular_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import * as SplashScreen from 'expo-splash-screen';
import type { NavigationContainerRef } from '@react-navigation/native';

SplashScreen.preventAutoHideAsync();

// Navigation ref so we can navigate from notification taps
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const [fontsLoaded] = useFonts({
    CormorantGaramond_700Bold_Italic,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_400Regular_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    // Foreground notification — just update badge
    notificationListener.current = addNotificationReceivedListener(() => {});

    // User tapped a notification — navigate to alerts
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      if (navigationRef.current?.isReady()) {
        if (data?.type === 'sos' && data?.childId) {
          navigationRef.current.navigate('ChildDetail', { childId: data.childId });
        } else {
          navigationRef.current.navigate('MainTabs', { screen: 'Alerts' });
        }
      }

      setBadgeCount(0);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppNavigator ref={navigationRef} />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
