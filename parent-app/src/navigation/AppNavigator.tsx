import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { COLORS } from '../utils/constants';
import type { RootStackParamList } from '../types';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 56,
        },
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: { fontWeight: '600', color: COLORS.text },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
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
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.white },
          headerTitleStyle: { fontWeight: '600', color: COLORS.text },
          headerTintColor: COLORS.primary,
          headerBackTitleVisible: false,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChildDetail"
              component={ChildDetailScreen}
              options={{ title: 'Child' }}
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
              options={{ title: 'App Management' }}
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
}
