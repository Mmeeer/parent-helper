import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, PairDeviceResponse } from '../../types';

type Props = {
  route: RouteProp<RootStackParamList, 'PairDevice'>;
};

export default function PairDeviceScreen({ route }: Props) {
  const { childId, childName } = route.params;
  const [pairingData, setPairingData] = useState<PairDeviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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
      Alert.alert('Error', error.message || 'Failed to generate pairing code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-secondary">
      <View className="flex-1 items-center px-8 pt-16">
        <Ionicons name="phone-portrait-outline" size={72} color="#4F46E5" />
        <Text className="text-xl font-bold text-slate-800 mt-5">
          Pair a Device
        </Text>
        <Text className="text-sm text-slate-500 mt-2 mb-8 text-center">
          Connect a new device for {childName}.
        </Text>

        {pairingData ? (
          <View className="self-stretch rounded-3xl p-8 items-center bg-white shadow-sm shadow-black/5">
            <Text className="text-sm font-semibold text-slate-500 mb-2">
              Pairing Code
            </Text>
            <Text
              className="text-4xl font-bold text-primary-600"
              style={{ letterSpacing: 8, fontFamily: 'monospace' }}
            >
              {pairingData.pairingCode}
            </Text>
            <Text
              className={`text-base font-semibold mt-3 ${countdown <= 60 ? 'text-red-500' : 'text-primary-600'}`}
            >
              {countdown > 0 ? formatTime(countdown) : 'Expired'}
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-2 leading-5">
              Enter this code in the Prime Kids app on the child's device.
            </Text>

            <TouchableOpacity
              onPress={handleGenerateCode}
              className="mt-4 py-2 flex-row items-center gap-x-1"
            >
              <Ionicons name="refresh" size={18} color="#4F46E5" />
              <Text className="text-primary-600 font-medium text-sm">Generate New Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="self-stretch gap-y-4 mb-8">
              {[
                { num: '1', text: 'Install "Prime Kids" app on the child\'s device' },
                { num: '2', text: 'Generate a pairing code below' },
                { num: '3', text: 'Enter the code on the child\'s device' },
              ].map((step) => (
                <View key={step.num} className="flex-row items-center gap-x-3.5">
                  <View className="w-8 h-8 rounded-full bg-primary-50 justify-center items-center">
                    <Text className="text-sm font-semibold text-primary-600">
                      {step.num}
                    </Text>
                  </View>
                  <Text className="flex-1 text-sm text-slate-800 leading-5">
                    {step.text}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleGenerateCode}
              disabled={loading}
              className="self-stretch bg-primary-600 rounded-xl py-3 items-center justify-center"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-bold text-base">Generate Pairing Code</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
