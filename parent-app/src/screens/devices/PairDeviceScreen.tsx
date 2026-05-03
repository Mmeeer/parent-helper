import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, PairDeviceResponse } from '../../types';
import { useTranslation } from 'react-i18next';
import { C } from '../../theme';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'PairDevice'>;
};

export default function PairDeviceScreen({ route }: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { childId, childName } = route.params;
  const [pairingData, setPairingData] = useState<PairDeviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Listen for the backend's `device:paired` socket event so the parent
  // automatically jumps to the child detail page the moment the child
  // completes pairing — no manual refresh needed.
  useEffect(() => {
    const unsub = onSocketEvent('device:paired', (data: any) => {
      if (data?.childId !== childId) return;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Replace this screen so back button doesn't return here.
      navigation.replace('ChildDetail', { childId, childName });
    });
    return unsub;
  }, [childId, childName, navigation]);

  const startCountdown = (expiresAt: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
    };
    update();
    timerRef.current = setInterval(update, 1000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const data = await api.pairDevice(childId);
      setPairingData(data);
      if (data.expiresAt) startCountdown(data.expiresAt);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('pairDevice.generateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-5 pb-10">
      {/* Page header */}
      <View className="mt-6 mb-7">
        <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1.5">{t('pairDevice.title')}</Text>
        <Text className="font-display text-[32px] font-extrabold text-gray-900 leading-9">
          {t('pairDevice.pairDevice')}
        </Text>
      </View>

      {/* Subtitle */}
      <Text className="text-sm text-gray-500 mb-8">
        {t('pairDevice.subtitle', { childName })}
      </Text>

      {pairingData ? (
        <View className="bg-white rounded-3xl border border-gray-100 p-7 items-center">
          <Text className="text-xs font-bold text-gray-400 tracking-wide mb-2.5">{t('pairDevice.pairingCode')}</Text>
          <View className="bg-gray-50 rounded-2xl px-6 py-4 items-center">
            <Text
              className="font-display font-extrabold text-3xl text-gray-900"
              style={{ letterSpacing: 10, fontFamily: 'monospace' }}
            >
              {pairingData.pairingCode}
            </Text>
          </View>
          <Text
            className="font-bold text-base mt-3"
            style={{
              color: countdown <= 60 ? C.danger500 : C.nest500,
            }}
          >
            {countdown > 0 ? formatTime(countdown) : t('pairDevice.expired')}
          </Text>
          <Text className="text-xs text-gray-400 text-center mt-3 leading-5">
            {t('pairDevice.codeInstruction')}
          </Text>

          <TouchableOpacity
            onPress={handleGenerateCode}
            className="mt-5 flex-row items-center gap-x-1.5"
          >
            <Ionicons name="refresh" size={18} color={C.nest500} />
            <Text className="text-sm font-medium text-nest-500">{t('pairDevice.generateNew')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Steps */}
          <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-6">
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3.5">{t('pairDevice.steps')}</Text>
            {[
              { num: '1', text: t('pairDevice.step1') },
              { num: '2', text: t('pairDevice.step2') },
              { num: '3', text: t('pairDevice.step3') },
            ].map((step) => (
              <View key={step.num} className="flex-row items-center gap-x-3.5 mb-4 last:mb-0">
                <View
                  className="w-8 h-8 rounded-full bg-nest-50 justify-center items-center shrink-0"
                >
                  <Text className="text-sm font-bold text-nest-500">
                    {step.num}
                  </Text>
                </View>
                <Text className="flex-1 text-sm text-gray-800 leading-5">
                  {step.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Generate button */}
          <TouchableOpacity
            onPress={handleGenerateCode}
            disabled={loading}
            className={`bg-nest-500 rounded-2xl items-center justify-center shadow-lg h-[52px] ${loading ? 'opacity-60' : ''}`}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-display font-bold text-white tracking-wide">
                {t('pairDevice.generateCode')}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
