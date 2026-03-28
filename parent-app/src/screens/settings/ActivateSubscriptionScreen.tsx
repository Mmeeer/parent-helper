import React, { useState, useEffect } from 'react';
import { View, Alert, TextInput, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const sub = subscription?.subscription;
  const isActive = subscription?.active;

  return (
    <View className="flex-1 bg-surface-secondary p-4">
      {/* Current Subscription Status */}
      {sub && (
        <View
          className={`rounded-2xl p-5 mb-5 bg-white shadow-sm shadow-black/5 ${isActive ? 'bg-green-50' : 'bg-red-50'}`}
          style={{ borderWidth: 1, borderColor: isActive ? '#bbf7d0' : '#fecaca' }}
        >
          <View className="flex-row items-center gap-x-2 mb-4">
            <Ionicons
              name={isActive ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={isActive ? '#22c55e' : '#ef4444'}
            />
            <Text className={`text-base font-bold ${isActive ? 'text-green-800' : 'text-red-700'}`}>
              {isActive ? 'Active Subscription' : 'Subscription Expired'}
            </Text>
          </View>

          <View className="gap-y-2.5">
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Key</Text>
              <Text className="text-xs font-semibold text-slate-800">{sub.key}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Max Kids</Text>
              <Text className="text-xs font-semibold text-slate-800">{sub.maxKids}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-slate-500">Kids Used</Text>
              <Text className="text-xs font-semibold text-slate-800">{sub.currentKids} / {sub.maxKids}</Text>
            </View>
            {sub.expiresAt && (
              <View className="flex-row justify-between">
                <Text className="text-xs text-slate-500">Expires</Text>
                <Text className={`text-xs font-semibold ${isActive ? 'text-slate-800' : 'text-red-600'}`}>
                  {formatCountdown(sub.expiresAt)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Activate Key Section */}
      {!isActive && (
        <View className="rounded-2xl p-5 mb-5 bg-white shadow-sm shadow-black/5">
          <Text className="text-base font-bold text-slate-800 mb-1">
            {sub ? 'Activate New Key' : 'Enter Subscription Key'}
          </Text>
          <Text className="text-xs text-slate-500 mb-4">
            Enter the subscription key provided by your administrator.
          </Text>

          <TextInput
            className="bg-surface-secondary border border-slate-200 rounded-xl px-4 py-3.5 text-center text-lg tracking-widest mb-4"
            style={{ fontFamily: 'monospace', color: '#1E293B' }}
            placeholder="PH-XXXX-XXXX-XXXX"
            placeholderTextColor="#94A3B8"
            value={key}
            onChangeText={setKey}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-3 items-center justify-center"
            onPress={handleActivate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-base">Activate Key</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!sub && !isActive && (
        <View className="items-center p-8 gap-y-3">
          <Ionicons name="key-outline" size={40} color="#94A3B8" />
          <Text className="text-sm text-slate-500 text-center">
            No active subscription. Enter a key to get started.
          </Text>
        </View>
      )}
    </View>
  );
}
