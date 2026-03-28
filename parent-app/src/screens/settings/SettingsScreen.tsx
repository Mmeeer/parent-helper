import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Text, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, CARD, LABEL } from '../../theme';
import type { RootStackParamList } from '../../types';

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subInfo, setSubInfo] = useState<api.SubscriptionInfo | null>(null);

  useEffect(() => {
    api.getSubscription().then((data) => { setSubInfo(data); }).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Гарах', 'Гарахдаа итгэлтэй байна уу?', [
      { text: 'Цуцлах', style: 'cancel' },
      { text: 'Гарах', style: 'destructive', onPress: () => { void logout(); } },
    ]);
  };

  const items = [
    {
      title: 'Бүртгэл',
      icon: 'person-outline' as const,
      subtitle: user?.email || 'Бүртгэлийг удирдах',
      onPress: () => {},
    },
    {
      title: 'Захиалга',
      icon: 'key-outline' as const,
      subtitle: subInfo?.active
        ? `Идэвхтэй — ${subInfo.subscription?.maxKids} хүүхэд`
        : 'Идэвхтэй захиалга байхгүй',
      onPress: () => navigation.navigate('ActivateSubscription'),
    },
    {
      title: 'Мэдэгдэл',
      icon: 'notifications-outline' as const,
      subtitle: 'Мэдэгдлийн тохиргоо',
      onPress: () => {},
    },
    {
      title: 'Тусламж',
      icon: 'help-circle-outline' as const,
      subtitle: 'Тусламж болон холбоо барих',
      onPress: () => {},
    },
    {
      title: 'Нууцлалын бодлого',
      icon: 'document-text-outline' as const,
      subtitle: 'Нууцлалын бодлого харах',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-secondary" showsVerticalScrollIndicator={false}>
      <View className="px-7 pb-10" style={{ paddingTop: top * 2 }}>

        {/* Header */}
        <View className="mt-6 mb-7">
          <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>Тохиргоо</Text>
        </View>

        {/* User profile card */}
        <View style={{ ...CARD, padding: 20, marginBottom: 24 }}>
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-ink-900 items-center justify-center shrink-0">
              <Text className="font-serif text-white" style={{ fontSize: 24, lineHeight: 28 }}>
                {user?.name?.charAt(0).toUpperCase() ?? 'P'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink-800">
                {user?.name || 'Parent'}
              </Text>
              <Text className="text-[13px] text-ink-400 mt-1">
                {user?.email || ''}
              </Text>
              <View style={{
                alignSelf: 'flex-start', marginTop: 6,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
                backgroundColor: subInfo?.active ? '#f0fdfa' : '#fff1f2',
              }}>
                <Text className="text-[10px] font-semibold" style={{ color: subInfo?.active ? C.teal : C.red }}>
                  {subInfo?.active ? 'Премиум' : 'Захиалга байхгүй'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings items */}
        <Text style={[LABEL, { marginBottom: 12 }]}>Бүртгэл</Text>
        <View style={{ ...CARD, overflow: 'hidden', marginBottom: 24 }}>
          {items.map((item, index) => (
            <React.Fragment key={item.title}>
              <Pressable onPress={item.onPress}>
                {({ pressed }) => (
                  <View className="flex-row items-center px-5 py-4" style={{ opacity: pressed ? 0.7 : 1 }}>
                    <View className="w-9 h-9 rounded-[10px] bg-ink-100 items-center justify-center" style={{ marginRight: 16 }}>
                      <Ionicons name={item.icon} size={18} color={C.ink700} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-ink-800">{item.title}</Text>
                      <Text className="text-xs text-ink-400 mt-0.5">{item.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={C.ink300} />
                  </View>
                )}
              </Pressable>
              {index < items.length - 1 && (
                <View className="h-px" style={{ backgroundColor: C.border, marginLeft: 72 }} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{ ...CARD, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Ionicons name="log-out-outline" size={18} color={C.red} />
          <Text className="text-sm font-semibold" style={{ color: C.red }}>Гарах</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={[LABEL, { textAlign: 'center', marginTop: 32 }]}>
          Prime Kids: Parent Helper v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
