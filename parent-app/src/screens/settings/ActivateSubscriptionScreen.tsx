import React, { useState, useEffect } from 'react';
import { View, Alert, TextInput, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import { C } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { useTranslation } from 'react-i18next';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'ActivateSubscription'>;
};

export default function ActivateSubscriptionScreen({ navigation }: Props) {
  const { t } = useTranslation();
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
      Alert.alert(t('common.error'), t('subscription.enterKeyError'));
      return;
    }
    setLoading(true);
    try {
      await api.activateSubscription(key.trim());
      Alert.alert(t('common.success'), t('subscription.activated'), [
        { text: 'За', onPress: () => { loadSubscription(); setKey(''); } },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('subscription.activateError'));
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return t('subscription.expired');
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? t('subscription.countdownDaysHours', { days, hours }) : t('subscription.countdownHours', { hours });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.floor(diff / 86400000);
  };

  const getProgress = (expiresAt: string) => {
    const days = getDaysRemaining(expiresAt);
    return Math.min(days / 30, 1);
  };

  if (subLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  const sub = subscription?.subscription;
  const isActive = subscription?.active;

  return (
    <ScrollView className="flex-1 bg-surface" showsVerticalScrollIndicator={false}>
      <View className="px-5 pb-10 pt-2">

        {/* Current status card */}
        {sub && isActive && (
          <View className="rounded-3xl p-5 mb-5 bg-nest-500"
          >
            <View className="flex-row items-center gap-3 mb-4">
              <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
              <Text className="text-[15px] font-bold text-white">
                {t('subscription.activeSubscription')}
              </Text>
            </View>

            {sub.expiresAt && (
              <>
                <Text className="font-display font-extrabold text-4xl text-white mb-1">
                  {getDaysRemaining(sub.expiresAt)} {t('subscription.daysRemaining')}
                </Text>
                <Text className="text-sm text-white/70 mb-4">{t('subscription.remaining')}</Text>
                <View className="h-2 rounded-full bg-white/20">
                  <View
                    className="h-2 rounded-full bg-white"
                    style={{ width: `${getProgress(sub.expiresAt) * 100}%` }}
                  />
                </View>
              </>
            )}

            <View className="mt-4 gap-y-2">
              {[
                { label: t('subscription.key'), value: sub.key },
                { label: t('subscription.children'), value: `${sub.currentKids} / ${sub.maxKids}` },
                ...(sub.expiresAt ? [{ label: t('subscription.expiresAt'), value: formatCountdown(sub.expiresAt) }] : []),
              ].map((row) => (
                <View key={row.label} className="flex-row justify-between">
                  <Text className="text-xs text-white/60">{row.label}</Text>
                  <Text className="text-xs font-semibold text-white">{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {sub && !isActive && (
          <View className="bg-white rounded-3xl p-5 mb-5 shadow-sm border border-gray-100">
            <View className="flex-row items-center gap-3 mb-5">
              <View className="w-10 h-10 rounded-full items-center justify-center bg-danger-50">
                <Ionicons name="alert-circle" size={22} color={C.danger500} />
              </View>
              <Text className="text-[15px] font-bold text-gray-900">
                {t('subscription.expiredSubscription')}
              </Text>
            </View>

            {[
              { label: t('subscription.key'), value: sub.key },
              { label: t('subscription.children'), value: `${sub.currentKids} / ${sub.maxKids}` },
              ...(sub.expiresAt ? [{ label: t('subscription.expiresDate'), value: formatCountdown(sub.expiresAt) }] : []),
            ].map((row) => (
              <View key={row.label} className="flex-row justify-between mb-2.5">
                <Text className="text-xs text-gray-400">{row.label}</Text>
                <Text className="text-xs font-semibold text-danger-500">{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Activate key section */}
        {!isActive && (
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1.5">
              {sub ? t('subscription.activateNew') : t('subscription.activate')}
            </Text>
            <Text className="font-display font-bold text-[28px] text-gray-900 mb-5 leading-8">
              {t('subscription.enterKey')}
            </Text>
            <Text className="text-sm text-gray-500 mb-5 leading-5">
              {t('subscription.enterKeyDesc')}
            </Text>

            <TextInput
              className="rounded-2xl bg-gray-50 border border-gray-200 font-mono text-center mb-4 px-4 py-3.5 text-base text-gray-900 tracking-widest"
              placeholder="PK-XXXX-XXXX"
              placeholderTextColor={C.gray400}
              value={key}
              onChangeText={setKey}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              className={`bg-nest-500 rounded-2xl items-center justify-center shadow-lg h-[52px] ${loading ? 'opacity-60' : 'opacity-100'}`}
              onPress={handleActivate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text className="font-display font-bold text-sm text-white tracking-tight">{t('subscription.activateKey')}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {Boolean(!sub && !isActive) && (
          <View className="items-center py-10 gap-3">
            <Ionicons name="key-outline" size={36} color={C.gray400} />
            <Text className="text-[13px] text-gray-400 text-center leading-5">
              {t('subscription.noSubscription')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
