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
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, PairDeviceResponse } from '../../types';
import { C, CARD, LABEL } from '../../theme';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'PairDevice'>;
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
      Alert.alert('Алдаа', error.message || 'Холболтын код үүсгэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface-secondary" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
      {/* Page header */}
      <View className="mt-6 mb-7">
        <Text style={[LABEL, { marginBottom: 6 }]}>ХОЛБОЛТ</Text>
        <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>
          Төхөөрөмж холбох
        </Text>
      </View>

      {/* Subtitle */}
      <Text className="text-sm text-ink-500 mb-8">
        {childName}-д шинэ төхөөрөмж холбох.
      </Text>

      {pairingData ? (
        <View style={{ ...CARD, padding: 28, alignItems: 'center' }}>
          <Text style={[LABEL, { marginBottom: 10 }]}>ХОЛБОЛТЫН КОД</Text>
          <Text
            className="text-ink-900"
            style={{ fontSize: 44, fontWeight: '800', letterSpacing: 10, fontFamily: 'monospace' }}
          >
            {pairingData.pairingCode}
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              marginTop: 12,
              color: countdown <= 60 ? C.red : C.teal,
            }}
          >
            {countdown > 0 ? formatTime(countdown) : 'Хугацаа дууссан'}
          </Text>
          <Text className="text-xs text-ink-400 text-center mt-3" style={{ lineHeight: 20 }}>
            Энэ кодыг хүүхдийн төхөөрөмж дээрх Prime Kids апп-д оруулна уу.
          </Text>

          <TouchableOpacity
            onPress={handleGenerateCode}
            className="mt-5 flex-row items-center gap-x-1.5"
          >
            <Ionicons name="refresh" size={18} color={C.teal} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: C.teal }}>Шинэ код үүсгэх</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Steps */}
          <View style={{ ...CARD, padding: 20, marginBottom: 24 }}>
            <Text style={[LABEL, { marginBottom: 14 }]}>АЛХМУУД</Text>
            {[
              { num: '1', text: 'Хүүхдийн төхөөрөмжид "Prime Kids" апп суулгах' },
              { num: '2', text: 'Доорх холболтын код үүсгэх' },
              { num: '3', text: 'Хүүхдийн төхөөрөмжид код оруулах' },
            ].map((step) => (
              <View key={step.num} className="flex-row items-center gap-x-3.5 mb-4 last:mb-0">
                <View
                  className="w-8 h-8 rounded-full bg-ink-100 justify-center items-center"
                  style={{ flexShrink: 0 }}
                >
                  <Text className="text-sm font-semibold text-ink-600">
                    {step.num}
                  </Text>
                </View>
                <Text className="flex-1 text-sm text-ink-800" style={{ lineHeight: 20 }}>
                  {step.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Generate button */}
          <TouchableOpacity
            onPress={handleGenerateCode}
            disabled={loading}
            className="bg-ink-900 rounded-xl items-center justify-center"
            style={{ height: 52, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
                Холболтын код үүсгэх
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
