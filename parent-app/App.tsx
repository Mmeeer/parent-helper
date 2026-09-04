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
import { Ionicons } from '@expo/vector-icons';
import type { NavigationContainerRef } from '@react-navigation/native';

// Navigation ref so we can navigate from notification taps
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

export default function App() {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [i18nReady, setI18nReady] = React.useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    Font.loadAsync({
      ...Ionicons.font,
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

    // User tapped a notification — navigate to alerts. When the app is cold-
    // started by the tap, navigation isn't ready yet: buffer and retry so an
    // SOS tap is never silently dropped.
    const navigateForTap = (data: any, attempt = 0) => {
      if (!navigationRef.current?.isReady()) {
        if (attempt < 20) setTimeout(() => navigateForTap(data, attempt + 1), 250);
        return;
      }
      if (data?.type === 'sos' && data?.childId) {
        // SOS goes straight to the live map so parent can see the child's
        // last location immediately. childName comes from the push data
        // when the backend is fresh; fall back to empty (LocationMap fetches
        // the name itself).
        navigationRef.current.navigate('LocationMap', {
          childId: data.childId,
          childName: data.childName ?? '',
        });
      } else {
        navigationRef.current.navigate('MainTabs', { screen: 'Alerts' });
      }
    };
    responseListener.current = addNotificationResponseListener((response) => {
      navigateForTap(response.notification.request.content.data);
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
