import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Text, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import type { RootStackParamList } from '../../types';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subInfo, setSubInfo] = useState<api.SubscriptionInfo | null>(null);

  useEffect(() => {
    api.getSubscription().then(setSubInfo).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const items = [
    {
      title: 'Account',
      icon: 'person-outline' as const,
      subtitle: user?.email || 'Manage your account',
      onPress: () => {},
    },
    {
      title: 'Subscription',
      icon: 'key-outline' as const,
      subtitle: subInfo?.active
        ? `Active — ${subInfo.subscription?.maxKids} kids`
        : 'No active subscription',
      onPress: () => navigation.navigate('ActivateSubscription'),
    },
    {
      title: 'Notification Settings',
      icon: 'notifications-outline' as const,
      subtitle: 'Configure alert preferences',
      onPress: () => {},
    },
    {
      title: 'Help & Support',
      icon: 'help-circle-outline' as const,
      subtitle: 'FAQ and contact support',
      onPress: () => {},
    },
    {
      title: 'Privacy Policy',
      icon: 'document-text-outline' as const,
      subtitle: 'View privacy policy',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      {/* User Info Card */}
      <View className="flex-row items-center mx-4 mt-4 rounded-2xl p-5 bg-white shadow-sm shadow-black/5">
        <View className="w-14 h-14 rounded-full bg-primary-600 items-center justify-center">
          <Ionicons name="person" size={28} color="#FFFFFF" />
        </View>
        <View className="flex-1 ml-3.5">
          <Text className="text-base font-bold text-slate-800">
            {user?.name || 'Parent'}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            {user?.email || ''}
          </Text>
          <View
            className={`self-start mt-1.5 px-2 py-0.5 rounded-lg ${subInfo?.active ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <Text
              className={`text-[11px] font-bold ${subInfo?.active ? 'text-green-800' : 'text-red-600'}`}
            >
              {subInfo?.active ? 'SUBSCRIBED' : 'NO SUBSCRIPTION'}
            </Text>
          </View>
        </View>
      </View>

      {/* Settings Items */}
      <View className="mx-4 mt-5 rounded-2xl overflow-hidden bg-white shadow-sm shadow-black/5">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Pressable onPress={item.onPress}>
              <View className="flex-row items-center p-4">
                <View className="w-9 h-9 rounded-[10px] bg-surface-tertiary items-center justify-center mr-3">
                  <Ionicons name={item.icon} size={22} color="#4F46E5" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-slate-800">
                    {item.title}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </Pressable>
            {index < items.length - 1 && <View className="h-px bg-slate-200 ml-16" />}
          </React.Fragment>
        ))}
      </View>

      {/* Sign Out Button */}
      <View className="mx-4 mt-5">
        <TouchableOpacity
          onPress={handleLogout}
          className="border border-danger-600 rounded-2xl py-3 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="log-out-outline" size={20} color="#E11D48" />
          <Text className="text-danger-600 font-semibold text-base">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text className="text-[11px] text-center text-slate-400 mt-5 mb-8">
        Prime Kids: Parent Helper v1.0.0
      </Text>
    </ScrollView>
  );
}
