import React, { useState, useEffect } from 'react';
import { View, Alert, TextInput } from 'react-native';
import { Surface, Text, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ActivateSubscription'>;
};

export default function ActivateSubscriptionScreen({ navigation }: Props) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [subscription, setSubscription] = useState<api.SubscriptionInfo | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setSubLoading(true);
    try {
      const data = await api.getSubscription();
      setSubscription(data);
    } catch {
      // No subscription
    } finally {
      setSubLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a subscription key.');
      return;
    }
    setLoading(true);
    try {
      await api.activateSubscription(key.trim());
      Alert.alert('Success', 'Subscription activated!', [
        { text: 'OK', onPress: () => { loadSubscription(); setKey(''); } },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to activate key.');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (subLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const sub = subscription?.subscription;
  const isActive = subscription?.active;

  return (
    <View className="flex-1 bg-surface-secondary p-4">
      {/* Current Subscription Status */}
      {sub && (
        <Surface
          elevation={1}
          className={`rounded-2xl p-5 mb-5 ${isActive ? 'bg-green-50' : 'bg-red-50'}`}
          style={{ borderWidth: 1, borderColor: isActive ? '#bbf7d0' : '#fecaca' }}
        >
          <View className="flex-row items-center gap-x-2 mb-4">
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={isActive ? '#22c55e' : '#ef4444'}
            />
            <Text variant="titleMedium" className={`font-bold ${isActive ? 'text-green-800' : 'text-red-700'}`}>
              {isActive ? 'Active Subscription' : 'Subscription Expired'}
            </Text>
          </View>

          <View className="gap-y-2.5">
            <View className="flex-row justify-between">
              <Text variant="bodySmall" className="text-slate-500">Key</Text>
              <Text variant="bodySmall" className="font-semibold text-slate-800">{sub.key}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="bodySmall" className="text-slate-500">Max Kids</Text>
              <Text variant="bodySmall" className="font-semibold text-slate-800">{sub.maxKids}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="bodySmall" className="text-slate-500">Kids Used</Text>
              <Text variant="bodySmall" className="font-semibold text-slate-800">{sub.currentKids} / {sub.maxKids}</Text>
            </View>
            {sub.expiresAt && (
              <View className="flex-row justify-between">
                <Text variant="bodySmall" className="text-slate-500">Expires</Text>
                <Text variant="bodySmall" className={`font-semibold ${isActive ? 'text-slate-800' : 'text-red-600'}`}>
                  {formatCountdown(sub.expiresAt)}
                </Text>
              </View>
            )}
          </View>
        </Surface>
      )}

      {/* Activate Key Section */}
      {!isActive && (
        <Surface elevation={1} className="rounded-2xl p-5 mb-5">
          <Text variant="titleMedium" className="font-bold text-slate-800 mb-1">
            {sub ? 'Activate New Key' : 'Enter Subscription Key'}
          </Text>
          <Text variant="bodySmall" className="text-slate-500 mb-4">
            Enter the subscription key provided by your administrator.
          </Text>

          <TextInput
            className="bg-surface-secondary border border-slate-200 rounded-xl px-4 py-3.5 text-center text-lg tracking-widest mb-4"
            style={{ fontFamily: 'monospace', color: colors.text }}
            placeholder="PH-XXXX-XXXX-XXXX"
            placeholderTextColor={colors.textMuted}
            value={key}
            onChangeText={setKey}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Button
            mode="contained"
            onPress={handleActivate}
            disabled={loading}
            buttonColor={colors.primary}
            textColor={colors.white}
            className="rounded-xl"
            contentStyle={{ paddingVertical: 6 }}
          >
            {loading ? 'Activating...' : 'Activate Key'}
          </Button>
        </Surface>
      )}

      {!sub && !isActive && (
        <View className="items-center p-8 gap-y-3">
          <Ionicons name="key-outline" size={40} color={colors.textMuted} />
          <Text variant="bodyMedium" className="text-slate-500 text-center">
            No active subscription. Enter a key to get started.
          </Text>
        </View>
      )}
    </View>
  );
}
