import React from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import type { RootStackParamList } from '../types';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1c1917',
        tabBarInactiveTintColor: '#d6d3d1',
        tabBarButton: ({ ref: _ref, ...props }) => (
          <Pressable {...props} android_ripple={null} />
        ),
        tabBarStyle: {
          backgroundColor: '#fafaf9',
          borderTopColor: '#e7e5e4',
          borderTopWidth: 1,
          paddingBottom: 24,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
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
          title: 'Нүүр',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: 'Мэдэгдэл',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Approvals"
        component={ApprovalsScreen}
        options={{
          title: 'Зөвшөөрөл',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Тохиргоо',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const AppNavigator = React.forwardRef<any>((_, ref) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color="#1c1917" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={ref}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#fafaf9' },
          headerTitleStyle: { fontFamily: 'CormorantGaramond_700Bold_Italic', fontSize: 20, color: '#1c1917' },
          headerTintColor: '#1c1917',
          headerBackButtonDisplayMode: 'minimal',
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
              options={{ title: 'Хүүхэд' }}
            />
            <Stack.Screen
              name="AddChild"
              component={AddChildScreen}
              options={{ title: 'Хүүхэд нэмэх' }}
            />
            <Stack.Screen
              name="RulesOverview"
              component={RulesOverviewScreen}
              options={{ title: 'Дүрэм' }}
            />
            <Stack.Screen
              name="ScreenTimeRules"
              component={ScreenTimeRulesScreen}
              options={{ title: 'Дэлгэцийн цаг' }}
            />
            <Stack.Screen
              name="AppRules"
              component={AppRulesScreen}
              options={{ title: 'Аппын удирдлага' }}
            />
            <Stack.Screen
              name="WebFilter"
              component={WebFilterScreen}
              options={{ title: 'Вэб шүүлт' }}
            />
            <Stack.Screen
              name="LocationMap"
              component={LocationScreen}
              options={{ title: 'Байршил' }}
            />
            <Stack.Screen
              name="DevicesList"
              component={DevicesListScreen}
              options={{ title: 'Төхөөрөмж' }}
            />
            <Stack.Screen
              name="PairDevice"
              component={PairDeviceScreen}
              options={{ title: 'Төхөөрөмж холбох' }}
            />
            <Stack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ title: 'Тайлан' }}
            />
            <Stack.Screen
              name="Geofences"
              component={GeofenceScreen}
              options={{ title: 'Геофенс' }}
            />
            <Stack.Screen
              name="ActivateSubscription"
              component={ActivateSubscriptionScreen}
              options={{ title: 'Захиалга' }}
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
