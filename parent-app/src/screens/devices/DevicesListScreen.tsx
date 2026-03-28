import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatTimeAgo } from '../../utils/formatters';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, DeviceStatus } from '../../types';
import { C, CARD, LABEL } from '../../theme';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'DevicesList'>;
  readonly route: RouteProp<RootStackParamList, 'DevicesList'>;
};

export default function DevicesListScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commandingId, setCommandingId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      const data = await api.getChildDevices(childId);
      setDevices(data);
    } catch {
      // May not have devices yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices]),
  );

  const sendCommand = async (deviceId: string, command: 'lock' | 'unlock' | 'locate' | 'sync') => {
    setCommandingId(deviceId);
    try {
      const result = await api.sendDeviceCommand(deviceId, command);
      Alert.alert('Команд илгээгдлээ', result.message);
      if (command === 'locate') {
        setTimeout(loadDevices, 3000);
      }
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Команд илгээхэд алдаа гарлаа.');
    } finally {
      setCommandingId(null);
    }
  };

  const doUnpair = async (deviceId: string) => {
    try {
      await api.unpairDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      Alert.alert('Дууссан', 'Төхөөрөмжийн холболт тасдагдлаа.');
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Төхөөрөмжийн холболтыг тасдаж чадсангүй.');
    }
  };

  const handleUnpair = (deviceId: string) => {
    Alert.alert(
      'Холболт тасдах',
      'Энэ төхөөрөмжийг устгахдаа итгэлтэй байна уу? Хүүхдийн апп дахин холбогдох шаардлагатай болно.',
      [
        { text: 'Цуцлах', style: 'cancel' },
        { text: 'Тасдах', style: 'destructive', onPress: () => { void doUnpair(deviceId); } },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} />}
    >
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text style={[LABEL, { marginBottom: 6 }]}>ТӨХӨӨРӨМЖҮҮД</Text>
        <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>
          {childName}-ийн төхөөрөмжүүд
        </Text>
      </View>

      {devices.length === 0 ? (
        <View className="items-center pt-[60px] px-10">
          <View className="w-16 h-16 rounded-full bg-ink-100 items-center justify-center mb-4">
            <Ionicons name="phone-portrait-outline" size={32} color={C.ink300} />
          </View>
          <Text className="text-sm font-semibold text-ink-500">Холбогдсон төхөөрөмж байхгүй</Text>
          <Text className="text-[13px] text-ink-400 text-center mt-1.5" style={{ lineHeight: 20 }}>
            Хяналт эхлэхийн тулд төхөөрөмж холбоно уу.
          </Text>
        </View>
      ) : (
        devices.map((device) => (
          <View key={device.id} style={{ ...CARD, marginHorizontal: 16, marginBottom: 12, padding: 16 }}>
            {/* Device Header */}
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-ink-100 justify-center items-center">
                <Ionicons name="phone-portrait" size={24} color={C.ink600} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-ink-900">
                  {device.model || 'Unknown Device'}
                </Text>
                <Text className="text-[11px] text-ink-400 mt-0.5">
                  {device.platform} {device.osVersion} — v{device.appVersion}
                </Text>
              </View>
              {/* Status chip */}
              <View
                className="flex-row items-center px-2.5 py-1 rounded-xl gap-x-1"
                style={{
                  backgroundColor: device.status === 'online' ? '#1A0d9488' : C.ink100,
                }}
              >
                <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: device.status === 'online' ? C.teal : C.ink400 }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    color: device.status === 'online' ? C.teal : C.ink400,
                  }}
                >
                  {device.status}
                </Text>
              </View>
            </View>

            {/* Device Stats */}
            <View className="flex-row gap-x-2.5 mt-3">
              {device.batteryLevel != null && (
                <View className="px-2.5 py-1 rounded-xl flex-row items-center gap-1 bg-ink-100">
                  <Ionicons
                    name={device.batteryLevel > 20 ? 'battery-half' : 'battery-dead'}
                    size={16}
                    color={device.batteryLevel > 20 ? C.teal : C.red}
                  />
                  <Text className="text-xs text-ink-500">
                    {device.batteryLevel}%
                  </Text>
                </View>
              )}
              <View className="px-2.5 py-1 rounded-xl flex-row items-center gap-1 bg-ink-100">
                <Ionicons name="time-outline" size={16} color={C.ink500} />
                <Text className="text-xs text-ink-500">
                  {device.lastSeen ? formatTimeAgo(device.lastSeen) : 'Never'}
                </Text>
              </View>
            </View>

            {/* Remote Commands */}
            <Text className="text-xs font-semibold text-ink-400 mt-4 mb-2">
              Алсын удирдлага
            </Text>
            <View className="flex-row gap-x-2">
              {[
                { cmd: 'lock' as const, icon: 'lock-closed-outline' as const, label: 'Түгжих', color: C.red },
                { cmd: 'unlock' as const, icon: 'lock-open-outline' as const, label: 'Нээх', color: C.teal },
                { cmd: 'locate' as const, icon: 'locate-outline' as const, label: 'Байршлыг олох', color: C.ink600 },
                { cmd: 'sync' as const, icon: 'sync-outline' as const, label: 'Синхрончлох', color: C.amber },
              ].map(({ cmd, icon, label, color }) => (
                <View key={cmd} className="flex-1 items-center py-3 rounded-xl bg-ink-100">
                  <TouchableOpacity
                    onPress={() => sendCommand(device.id, cmd)}
                    disabled={commandingId === device.id}
                    className="p-1"
                  >
                    <Ionicons name={icon} size={20} color={color} />
                  </TouchableOpacity>
                  <Text className="text-[11px] text-ink-700 -mt-1">{label}</Text>
                </View>
              ))}
            </View>

            {commandingId === device.id && (
              <ActivityIndicator className="mt-2" color={C.ink900} />
            )}

            {/* Unpair */}
            <TouchableOpacity
              onPress={() => handleUnpair(device.id)}
              className="mt-3 py-2 flex-row items-center justify-center gap-x-1"
            >
              <Ionicons name="unlink-outline" size={16} color={C.red} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: C.red }}>Холболт тасдах</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Pair New Device */}
      <TouchableOpacity
        onPress={() => navigation.navigate('PairDevice', { childId, childName })}
        className="bg-ink-900 rounded-xl items-center justify-center mx-4 mt-2 flex-row gap-x-2"
        style={{ height: 52 }}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
          Шинэ төхөөрөмж холбох
        </Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
