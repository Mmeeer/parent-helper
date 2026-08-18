import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { DEMO_SCREEN } from '../utils/demoHooks';
import * as api from '../services/api';
import { useAuth } from '../store/AuthContext';
import { onSocketEvent } from '../services/socket';
import { isIosOnly } from '../utils/platform';
import type { RootStackParamList } from '../types';
import { C } from '../theme';
import { ONBOARDING_COMPLETE_KEY } from '../screens/onboarding/OnboardingScreen';
import ConnectionBanner from '../components/ConnectionBanner';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';

// Main Screens
import HomeScreen from '../screens/dashboard/DashboardScreen';
import AlertsScreen from '../screens/alerts/AlertsScreen';
import ApprovalsScreen from '../screens/approvals/ApprovalsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Stack Screens
import ChildDetailScreen from '../screens/children/ChildDetailScreen';
import AddChildScreen from '../screens/children/AddChildScreen';
import RulesOverviewScreen from '../screens/rules/RulesOverviewScreen';
import ScreenTimeRulesScreen from '../screens/rules/ScreenTimeRulesScreen';
import AppRulesScreen from '../screens/rules/AppRulesScreen';
import WebFilterScreen from '../screens/rules/WebFilterScreen';
import LocationScreen from '../screens/location/LocationScreen';
import DevicesListScreen from '../screens/devices/DevicesListScreen';
import PairDeviceScreen from '../screens/devices/PairDeviceScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import GeofenceScreen from '../screens/geofences/GeofenceScreen';
import ActivateSubscriptionScreen from '../screens/settings/ActivateSubscriptionScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import PrivacyPolicyScreen from '../screens/settings/PrivacyPolicyScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  // Hook inside the navigator component so tab titles re-render on language change.
  const { t } = useTranslation();
  // App-install approvals are Android-only; hide the tab when every paired device is an iPhone.
  const [iosOnly, setIosOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const children = await api.getChildren();
        const perChild = await Promise.all(
          children.map((c) => api.getChildDevices(c._id).catch(() => [])),
        );
        if (!cancelled) setIosOnly(isIosOnly(perChild.flat()));
      } catch {
        // Best effort — default to showing the tab
      }
    };
    refresh();
    const unsub = onSocketEvent('device:paired', () => { refresh(); });
    return () => { cancelled = true; unsub(); };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <ConnectionBanner />
      <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.nest500,
        tabBarInactiveTintColor: C.gray400,
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable {...props} android_ripple={null} />
        ),
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderTopColor: C.gray100,
          borderTopWidth: 1,
          paddingBottom: 24,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: t('nav.alerts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
          tabBarBadgeStyle: { backgroundColor: C.danger500, fontSize: 9, minWidth: 16, height: 16, lineHeight: 16 },
        }}
      />
      {!iosOnly && (
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{
          title: t('nav.approvals'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle-outline" size={size} color={color} />
          ),
          tabBarBadgeStyle: { backgroundColor: C.warm500, fontSize: 9, minWidth: 16, height: 16, lineHeight: 16 },
        }}
      />
      )}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('nav.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
    </View>
  );
}

const AppNavigator = React.forwardRef<any>((_, ref) => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((v) => setOnboardingDone(v === 'true'));
  }, []);

  if (isLoading || onboardingDone === null) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  const needsOnboarding = isAuthenticated && !onboardingDone;

  // Dev-only screenshot hook: jump to a screen once the navigator is ready.
  const onReady = () => {
    if (!DEMO_SCREEN || !isAuthenticated) return;
    const nav = (ref as React.RefObject<any>)?.current;
    if (!nav) return;
    (async () => {
      try {
        const [route, tab] = DEMO_SCREEN.split(':');
        if (route === 'MainTabs') {
          nav.navigate('MainTabs', tab ? { screen: tab } : undefined);
          return;
        }
        const children = await api.getChildren();
        const child = children[0];
        if (!child) return;
        nav.navigate(route, { childId: child._id, childName: child.name });
      } catch { /* ignore in demo */ }
    })();
  };

  return (
    <NavigationContainer ref={ref} onReady={onReady}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTitleStyle: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: C.gray900 },
          headerTintColor: C.gray900,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        {isAuthenticated ? (
          <>
            {needsOnboarding && (
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
            )}
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChildDetail"
              component={ChildDetailScreen}
              options={{ title: t('nav.childDetail') }}
            />
            <Stack.Screen
              name="AddChild"
              component={AddChildScreen}
              options={{ title: t('nav.addChild') }}
            />
            <Stack.Screen
              name="RulesOverview"
              component={RulesOverviewScreen}
              options={{ title: t('nav.rules') }}
            />
            <Stack.Screen
              name="ScreenTimeRules"
              component={ScreenTimeRulesScreen}
              options={{ title: t('nav.screenTime') }}
            />
            <Stack.Screen
              name="AppRules"
              component={AppRulesScreen}
              options={{ title: t('nav.appRules') }}
            />
            <Stack.Screen
              name="WebFilter"
              component={WebFilterScreen}
              options={{ title: t('nav.webFilter') }}
            />
            <Stack.Screen
              name="LocationMap"
              component={LocationScreen}
              options={{ title: t('nav.location') }}
            />
            <Stack.Screen
              name="DevicesList"
              component={DevicesListScreen}
              options={{ title: t('nav.devices') }}
            />
            <Stack.Screen
              name="PairDevice"
              component={PairDeviceScreen}
              options={{ title: t('nav.pairDevice') }}
            />
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ title: t('nav.reports') }}
            />
            <Stack.Screen
              name="Geofences"
              component={GeofenceScreen}
              options={{ title: t('nav.geofences') }}
            />
            <Stack.Screen
              name="ActivateSubscription"
              component={ActivateSubscriptionScreen}
              options={{ title: t('nav.subscription') }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ title: t('nav.editProfile') }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ title: t('nav.changePassword') }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ title: t('nav.notificationSettings') }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ title: t('nav.privacyPolicy') }}
            />
            <Stack.Screen
              name="VerifyEmail"
              component={EmailVerificationScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
});

export default AppNavigator;
