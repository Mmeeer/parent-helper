import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../store/AuthContext';
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
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
          tabBarBadgeStyle: { backgroundColor: C.danger500, fontSize: 9, minWidth: 16, height: 16, lineHeight: 16 },
        }}
      />
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{
          title: 'Approvals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle-outline" size={size} color={color} />
          ),
          tabBarBadgeStyle: { backgroundColor: C.warm500, fontSize: 9, minWidth: 16, height: 16, lineHeight: 16 },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
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

  return (
    <NavigationContainer ref={ref}>
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
              options={{ title: 'Child Detail' }}
            />
            <Stack.Screen
              name="AddChild"
              component={AddChildScreen}
              options={{ title: 'Add Child' }}
            />
            <Stack.Screen
              name="RulesOverview"
              component={RulesOverviewScreen}
              options={{ title: 'Rules' }}
            />
            <Stack.Screen
              name="ScreenTimeRules"
              component={ScreenTimeRulesScreen}
              options={{ title: 'Screen Time' }}
            />
            <Stack.Screen
              name="AppRules"
              component={AppRulesScreen}
              options={{ title: 'App Rules' }}
            />
            <Stack.Screen
              name="WebFilter"
              component={WebFilterScreen}
              options={{ title: 'Web Filter' }}
            />
            <Stack.Screen
              name="LocationMap"
              component={LocationScreen}
              options={{ title: 'Location' }}
            />
            <Stack.Screen
              name="DevicesList"
              component={DevicesListScreen}
              options={{ title: 'Devices' }}
            />
            <Stack.Screen
              name="PairDevice"
              component={PairDeviceScreen}
              options={{ title: 'Pair Device' }}
            />
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ title: 'Reports' }}
            />
            <Stack.Screen
              name="Geofences"
              component={GeofenceScreen}
              options={{ title: 'Geofences' }}
            />
            <Stack.Screen
              name="ActivateSubscription"
              component={ActivateSubscriptionScreen}
              options={{ title: 'Subscription' }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ title: 'Профайл засах' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ title: 'Нууц үг солих' }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ title: 'Мэдэгдлийн тохиргоо' }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ title: 'Нууцлалын бодлого' }}
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
