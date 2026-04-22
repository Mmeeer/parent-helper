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
import { initI18n } from './src/i18n';
// @ts-ignore - expo-font may not have types installed
import * as Font from 'expo-font';
import type { NavigationContainerRef } from '@react-navigation/native';

// Navigation ref so we can navigate from notification taps
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [i18nReady, setI18nReady] = React.useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    Font.loadAsync({
      Nunito_400Regular: require('./assets/fonts/Nunito-Regular.ttf'),
      Nunito_500Medium: require('./assets/fonts/Nunito-Medium.ttf'),
      Nunito_600SemiBold: require('./assets/fonts/Nunito-SemiBold.ttf'),
      Nunito_700Bold: require('./assets/fonts/Nunito-Bold.ttf'),
      Outfit_700Bold: require('./assets/fonts/Outfit-Bold.ttf'),
      Outfit_800ExtraBold: require('./assets/fonts/Outfit-ExtraBold.ttf'),
    }).then(() => setFontsLoaded(true)).catch(() => setFontsLoaded(true));
  }, []);

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

  if (!fontsLoaded || !i18nReady) return null;

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
