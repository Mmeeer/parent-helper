import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Surface, Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
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
        <Ionicons name="phone-portrait-outline" size={72} color={colors.primary} />
        <Text variant="headlineSmall" className="font-bold text-slate-800 mt-5">
          Pair a Device
        </Text>
        <Text variant="bodyMedium" className="text-slate-500 mt-2 mb-8 text-center">
          Connect a new device for {childName}.
        </Text>

        {pairingData ? (
          <Surface className="self-stretch rounded-3xl p-8 items-center" elevation={2}>
            <Text variant="labelLarge" className="text-slate-500 mb-2">
              Pairing Code
            </Text>
            <Text
              variant="displayMedium"
              className="font-bold text-primary-600"
              style={{ letterSpacing: 8, fontFamily: 'monospace' }}
            >
              {pairingData.pairingCode}
            </Text>
            <Text
              variant="titleMedium"
              className={`font-bold mt-3 ${countdown <= 60 ? 'text-red-500' : 'text-primary-600'}`}
            >
              {countdown > 0 ? formatTime(countdown) : 'Expired'}
            </Text>
            <Text variant="bodySmall" className="text-slate-500 text-center mt-2 leading-5">
              Enter this code in the Parent Helper app on the child's device.
            </Text>

            <Button
              mode="text"
              icon={() => <Ionicons name="refresh" size={18} color={colors.primary} />}
              onPress={handleGenerateCode}
              textColor={colors.primary}
              className="mt-4"
            >
              Generate New Code
            </Button>
          </Surface>
        ) : (
          <>
            <View className="self-stretch gap-y-4 mb-8">
              {[
                { num: '1', text: 'Install "Parent Helper" app on the child\'s device' },
                { num: '2', text: 'Generate a pairing code below' },
                { num: '3', text: 'Enter the code on the child\'s device' },
              ].map((step) => (
                <View key={step.num} className="flex-row items-center gap-x-3.5">
                  <View className="w-8 h-8 rounded-full bg-primary-50 justify-center items-center">
                    <Text variant="labelLarge" className="font-bold text-primary-600">
                      {step.num}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" className="flex-1 text-slate-800 leading-5">
                    {step.text}
                  </Text>
                </View>
              ))}
            </View>

            <Button
              mode="contained"
              onPress={handleGenerateCode}
              disabled={loading}
              buttonColor={colors.primary}
              textColor={colors.white}
              className="self-stretch rounded-xl py-1"
              contentStyle={{ paddingVertical: 6 }}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                'Generate Pairing Code'
              )}
            </Button>
          </>
        )}
      </View>
    </View>
  );
}
