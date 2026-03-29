import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Text, Pressable, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../types';
import { C } from '../../theme';

type SettingsItem = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  toggle?: boolean;
  onPress: () => void;
};

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subInfo, setSubInfo] = useState<api.SubscriptionInfo | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    api.getSubscription().then((data) => { setSubInfo(data); }).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Гарах', 'Гарахдаа итгэлтэй байна уу?', [
      { text: 'Цуцлах', style: 'cancel' },
      { text: 'Гарах', style: 'destructive', onPress: () => { void logout(); } },
    ]);
  };

  const notificationItems: SettingsItem[] = [
    {
      title: 'Мэдэгдэл',
      icon: 'notifications-outline',
      iconBg: 'bg-warm-50',
      iconColor: C.warm500,
      toggle: true,
      onPress: () => setNotificationsEnabled((v) => !v),
    },
  ];

  const accountItems: SettingsItem[] = [
    {
      title: 'Бүртгэл',
      icon: 'person-outline',
      iconBg: 'bg-nest-50',
      iconColor: C.nest500,
      subtitle: user?.email || 'Бүртгэлийг удирдах',
      onPress: () => {},
    },
    {
      title: 'Захиалга',
      icon: 'key-outline',
      iconBg: 'bg-purple-50',
      iconColor: '#8b5cf6',
      value: subInfo?.active
        ? `Идэвхтэй — ${subInfo.subscription?.maxKids} хүүхэд`
        : 'Идэвхтэй захиалга байхгүй',
      valueColor: subInfo?.active ? 'text-safe-600' : 'text-gray-400',
      onPress: () => navigation.navigate('ActivateSubscription'),
    },
  ];

  const supportItems: SettingsItem[] = [
    {
      title: 'Хэл',
      icon: 'language-outline',
      iconBg: 'bg-nest-50',
      iconColor: C.nest500,
      value: 'Монгол',
      onPress: () => {},
    },
    {
      title: 'Тусламж',
      icon: 'help-circle-outline',
      iconBg: 'bg-safe-50',
      iconColor: C.safe500,
      onPress: () => {},
    },
    {
      title: 'Нууцлалын бодлого',
      icon: 'document-text-outline',
      iconBg: 'bg-gray-100',
      iconColor: C.gray500,
      onPress: () => {},
    },
  ];

  const renderSection = (label: string, items: SettingsItem[]) => (
    <View className="mb-6">
      <Text className="text-xs text-gray-400 font-bold px-1 mb-2">{label}</Text>
      <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        {items.map((item, index) => (
          <Pressable key={item.title} onPress={item.onPress}>
            {({ pressed }) => (
              <View
                className={`p-4 flex-row items-center ${index < items.length - 1 ? 'border-b border-gray-50' : ''}`}
                style={{ opacity: pressed ? 0.7 : 1 }}
              >
                <View className={`w-9 h-9 rounded-xl ${item.iconBg} items-center justify-center mr-3`}>
                  <Ionicons name={item.icon} size={18} color={item.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800">{item.title}</Text>
                  {item.subtitle && (
                    <Text className="text-xs text-gray-400 font-semibold mt-0.5">{item.subtitle}</Text>
                  )}
                </View>
                {item.value && (
                  <Text className={`text-xs ${subInfo?.active ? 'font-bold' : 'font-semibold'} ${item.valueColor ?? 'text-gray-400'} mr-2`}>
                    {item.value}
                  </Text>
                )}
                {item.toggle ? (
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: C.gray200, true: C.safe500 }}
                    thumbColor="#ffffff"
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                )}
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-surface" showsVerticalScrollIndicator={false}>
      <View className="px-6 pb-10" style={{ paddingTop: top + 16 }}>

        {/* Header */}
        <View className="mt-4 mb-6">
          <Text className="font-display font-extrabold text-xl text-gray-900">Тохиргоо</Text>
        </View>

        {/* Profile card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: C.nest500 }}>
              <View className="absolute inset-0 rounded-2xl opacity-30" style={{ backgroundColor: C.nest400, transform: [{ scale: 0.7 }] }} />
              <Text className="font-display font-bold text-white text-xl">
                {user?.name?.charAt(0).toUpperCase() ?? 'P'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-display font-bold text-gray-900 text-lg">
                {user?.name || 'Parent'}
              </Text>
              <Text className="text-sm text-gray-400 mt-0.5">
                {user?.email || ''}
              </Text>
              <View className="flex-row items-center mt-1.5">
                <View className={`w-2 h-2 rounded-full mr-1.5 ${subInfo?.active ? 'bg-safe-400' : 'bg-gray-300'}`} />
                <Text className={`text-xs font-bold ${subInfo?.active ? 'text-safe-600' : 'text-gray-400'}`}>
                  {subInfo?.active ? 'Premium идэвхтэй' : 'Захиалга байхгүй'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.gray300} />
          </View>
        </View>

        {/* Settings sections */}
        {renderSection('NOTIFICATIONS', notificationItems)}
        {renderSection('ACCOUNT', accountItems)}
        {renderSection('SUPPORT', supportItems)}

        {/* Logout button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="w-full py-3.5 bg-danger-50 rounded-2xl items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="font-display font-bold text-sm text-danger-500">
            Гарах
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <Text className="text-xs text-gray-400 font-bold text-center mt-8">
          Prime Kids: Parent Helper v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
