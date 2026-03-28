import React, { useState, useEffect } from 'react';
import { View, Alert, TextInput, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import { C, CARD, LABEL } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'ActivateSubscription'>;
};

export default function ActivateSubscriptionScreen({ navigation }: Props) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [subscription, setSubscription] = useState<api.SubscriptionInfo | null>(null);

  useEffect(() => { loadSubscription(); }, []);

  const loadSubscription = async () => {
    setSubLoading(true);
    try {
      const data = await api.getSubscription();
      setSubscription(data);
    } catch {
      // no subscription
    } finally {
      setSubLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!key.trim()) {
      Alert.alert('Алдаа', 'Захиалгын түлхүүрийг оруулна уу.');
      return;
    }
    setLoading(true);
    try {
      await api.activateSubscription(key.trim());
      Alert.alert('Амжилттай', 'Захиалга идэвхжлээ!', [
        { text: 'За', onPress: () => { loadSubscription(); setKey(''); } },
      ]);
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Түлхүүрийг идэвхжүүлэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Хугацаа дууссан';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `${days}өдөр ${hours}цаг үлдлээ` : `${hours}цаг үлдлээ`;
  };

  if (subLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  const sub = subscription?.subscription;
  const isActive = subscription?.active;

  return (
    <ScrollView className="flex-1 bg-surface-secondary" showsVerticalScrollIndicator={false}>
      <View className="px-7 pb-10 pt-2">

        {/* Current status card */}
        {sub && (
          <View style={{
            ...CARD,
            padding: 24, marginBottom: 20,
            ...(isActive
              ? { backgroundColor: '#f0fdfa', borderColor: '#99f6e4' }
              : { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }),
          }}>
            <View className="flex-row items-center gap-3 mb-5">
              <View className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: isActive ? '#ccfbf1' : '#fee2e2' }}>
                <Ionicons
                  name={isActive ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={isActive ? C.teal : C.red}
                />
              </View>
              <Text className="text-[15px] font-semibold text-ink-900">
                {isActive ? 'Идэвхтэй захиалга' : 'Захиалга дууссан'}
              </Text>
            </View>

            {[
              { label: 'Түлхүүр', value: sub.key },
              { label: 'Хүүхэд', value: `${sub.currentKids} / ${sub.maxKids}` },
              ...(sub.expiresAt ? [{ label: 'Дуусах огноо', value: formatCountdown(sub.expiresAt) }] : []),
            ].map((row) => (
              <View key={row.label} className="flex-row justify-between mb-2.5">
                <Text className="text-xs text-ink-400">{row.label}</Text>
                <Text className="text-xs font-semibold" style={{ color: isActive ? C.ink800 : C.red }}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Activate key section */}
        {!isActive && (
          <View style={{ ...CARD, padding: 24 }}>
            <Text style={[LABEL, { marginBottom: 6 }]}>
              {sub ? 'Шинэ түлхүүр идэвхжүүлэх' : 'Идэвхжүүлэх'}
            </Text>
            <Text className="font-serif text-[28px] text-ink-900 mb-5" style={{ lineHeight: 32 }}>
              Түлхүүр оруулах
            </Text>
            <Text className="text-sm text-ink-400 mb-5" style={{ lineHeight: 20 }}>
              Администраторын өгсөн захиалгын түлхүүрийг оруулна уу.
            </Text>

            <TextInput
              style={{
                backgroundColor: C.bg, borderWidth: 1, borderColor: C.ink200,
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 16, color: C.ink900, letterSpacing: 2,
                textAlign: 'center', marginBottom: 16,
              }}
              placeholder="PK-XXXX-XXXX"
              placeholderTextColor={C.ink300}
              value={key}
              onChangeText={setKey}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              className="bg-ink-900 rounded-xl items-center justify-center"
              style={{ height: 52, opacity: loading ? 0.6 : 1 }}
              onPress={handleActivate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>Түлхүүр идэвхжүүлэх</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {Boolean(!sub && !isActive) && (
          <View className="items-center py-10 gap-3">
            <Ionicons name="key-outline" size={36} color={C.ink300} />
            <Text className="text-[13px] text-ink-400 text-center" style={{ lineHeight: 20 }}>
              Идэвхтэй захиалга байхгүй. Эхлэхийн тулд түлхүүр оруулна уу.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
