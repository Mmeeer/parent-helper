import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Text, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import type { RootStackParamList } from '../../types';

// Type scale (matches HomeScreen):
// title:  15px/600 — card titles, item titles
// body:   14px/400 — subtitles, descriptions
// label:  12px/500 — meta, badges
// btn:    14px/600 — button text

const SHADOW = {
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
} as const;

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subInfo, setSubInfo] = useState<api.SubscriptionInfo | null>(null);

  useEffect(() => {
    api.getSubscription().then(setSubInfo).catch(() => null);
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
    <ScrollView className="flex-1 bg-slate-50">
      {/* User Info Card */}
      <View className="flex-row items-center mx-4 mt-5 rounded-2xl p-5 bg-white" style={SHADOW}>
        <View className="w-14 h-14 rounded-full bg-primary-600 items-center justify-center">
          <Ionicons name="person" size={28} color="#FFFFFF" />
        </View>
        <View className="flex-1 ml-4">
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>
            {user?.name || 'Parent'}
          </Text>
          <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
            {user?.email || ''}
          </Text>
          <View
            className={`self-start mt-2 px-2.5 py-1 rounded-full ${subInfo?.active ? 'bg-emerald-50' : 'bg-red-50'}`}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: subInfo?.active ? '#059669' : '#E11D48',
              }}
            >
              {subInfo?.active ? 'Active' : 'No Subscription'}
            </Text>
          </View>
        </View>
      </View>

      {/* Settings Items */}
      <View className="mx-4 mt-5 rounded-2xl overflow-hidden bg-white" style={SHADOW}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Pressable onPress={item.onPress}>
              {({ pressed }) => (
                <View
                  className="flex-row items-center px-5 py-4"
                  style={pressed ? { opacity: 0.7 } : {}}
                >
                  <View className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center mr-4">
                    <Ionicons name={item.icon} size={20} color="#4F46E5" />
                  </View>
                  <View className="flex-1">
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </View>
              )}
            </Pressable>
            {index < items.length - 1 && <View className="h-px bg-slate-100 ml-[72px]" />}
          </React.Fragment>
        ))}
      </View>

      {/* Sign Out Button */}
      <View className="mx-4 mt-5">
        <TouchableOpacity
          onPress={handleLogout}
          className="border border-red-200 bg-white rounded-2xl py-4 flex-row items-center justify-center gap-2"
          style={SHADOW}
        >
          <Ionicons name="log-out-outline" size={20} color="#E11D48" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#E11D48' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
        Prime Kids: Parent Helper v1.0.0
      </Text>
    </ScrollView>
  );
}
