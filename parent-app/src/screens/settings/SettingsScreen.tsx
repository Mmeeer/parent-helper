import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Surface, Text, Avatar, Chip, Button, TouchableRipple, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
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
      <Surface elevation={1} className="flex-row items-center mx-4 mt-4 rounded-2xl p-5">
        <Avatar.Icon
          size={56}
          icon={() => <Ionicons name="person" size={28} color={colors.white} />}
          color={colors.white}
          style={{ backgroundColor: colors.primary }}
        />
        <View className="flex-1 ml-3.5">
          <Text variant="titleMedium" className="font-bold text-slate-800">
            {user?.name || 'Parent'}
          </Text>
          <Text variant="bodySmall" className="text-slate-500 mt-0.5">
            {user?.email || ''}
          </Text>
          <Chip
            compact
            textStyle={{ fontSize: 11, fontWeight: '700', color: subInfo?.active ? '#166534' : '#dc2626' }}
            className={`self-start mt-1.5 ${subInfo?.active ? 'bg-green-50' : 'bg-red-50'}`}
          >
            {subInfo?.active ? 'SUBSCRIBED' : 'NO SUBSCRIPTION'}
          </Chip>
        </View>
      </Surface>

      {/* Settings Items */}
      <Surface elevation={1} className="mx-4 mt-5 rounded-2xl overflow-hidden">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <TouchableRipple
              onPress={item.onPress}
              rippleColor="rgba(79, 70, 229, 0.06)"
            >
              <View className="flex-row items-center p-4">
                <View className="w-9 h-9 rounded-[10px] bg-surface-tertiary items-center justify-center mr-3">
                  <Ionicons name={item.icon} size={22} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text variant="bodyLarge" className="font-medium text-slate-800">
                    {item.title}
                  </Text>
                  <Text variant="labelSmall" className="text-slate-500 mt-0.5">
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </TouchableRipple>
            {index < items.length - 1 && <Divider className="ml-16" />}
          </React.Fragment>
        ))}
      </Surface>

      {/* Sign Out Button */}
      <View className="mx-4 mt-5">
        <Button
          mode="outlined"
          onPress={handleLogout}
          icon={({ size }) => (
            <Ionicons name="log-out-outline" size={size} color={colors.danger} />
          )}
          textColor={colors.danger}
          contentStyle={{ paddingVertical: 4 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
          style={{ borderColor: colors.danger, borderRadius: 16 }}
        >
          Sign Out
        </Button>
      </View>

      {/* Version */}
      <Text variant="labelSmall" className="text-center text-slate-400 mt-5 mb-8">
        Parent Helper v1.0.0
      </Text>
    </ScrollView>
  );
}
