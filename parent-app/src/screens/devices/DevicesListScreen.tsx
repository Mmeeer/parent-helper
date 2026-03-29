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
import { C } from '../../theme';

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
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} />}
    >
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1.5">ТӨХӨӨРӨМЖҮҮД</Text>
        <Text className="font-display text-[32px] font-extrabold text-gray-900 leading-9">
          {childName}-ийн төхөөрөмжүүд
        </Text>
      </View>

      {devices.length === 0 ? (
        <View className="items-center pt-[60px] px-10">
          <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Ionicons name="phone-portrait-outline" size={32} color={C.gray300} />
          </View>
          <Text className="text-sm font-semibold text-gray-500">Холбогдсон төхөөрөмж байхгүй</Text>
          <Text className="text-[13px] text-gray-400 text-center mt-1.5 leading-5">
            Хяналт эхлэхийн тулд төхөөрөмж холбоно уу.
          </Text>
        </View>
      ) : (
        devices.map((device) => (
          <View key={device.id} className="mx-4 mb-3 p-4 bg-white rounded-3xl border border-gray-100">
            {/* Device Header */}
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-nest-50 justify-center items-center">
                <Ionicons name="phone-portrait" size={22} color={C.nest500} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-sm font-bold text-gray-900">
                  {device.model || 'Unknown Device'}
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  {device.platform} {device.osVersion} — v{device.appVersion}
                </Text>
              </View>
              {/* Status chip */}
              <View
                className="flex-row items-center px-2.5 py-1 rounded-2xl gap-x-1"
                style={{
                  backgroundColor: device.status === 'online' ? C.safe50 : C.gray100,
                }}
              >
                <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: device.status === 'online' ? C.safe400 : C.gray400 }}
                />
                <Text
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    color: device.status === 'online' ? C.safe600 : C.gray400,
                  }}
                >
                  {device.status === 'online' ? 'Online' : device.status}
                </Text>
              </View>
            </View>

            {/* Device Stats */}
            <View className="flex-row gap-x-2.5 mt-3">
              {device.batteryLevel != null && (
                <View className="px-2.5 py-1 rounded-2xl flex-row items-center gap-1 bg-gray-50">
                  <Ionicons
                    name={device.batteryLevel > 20 ? 'battery-half' : 'battery-dead'}
                    size={16}
                    color={device.batteryLevel > 50 ? C.safe400 : device.batteryLevel > 20 ? C.warm500 : C.danger500}
                  />
                  <Text className="text-xs text-gray-500">
                    {device.batteryLevel}%
                  </Text>
                </View>
              )}
              <View className="px-2.5 py-1 rounded-2xl flex-row items-center gap-1 bg-gray-50">
                <Ionicons name="time-outline" size={16} color={C.gray500} />
                <Text className="text-xs text-gray-500">
                  {device.lastSeen ? formatTimeAgo(device.lastSeen) : 'Never'}
                </Text>
              </View>
            </View>

            {/* Remote Commands */}
            <Text className="text-xs font-bold text-gray-400 uppercase mt-4 mb-2">
              Алсын удирдлага
            </Text>
            <View className="flex-row gap-x-2">
              {[
                { cmd: 'lock' as const, icon: 'lock-closed-outline' as const, label: 'Түгжих', color: C.danger500, bg: C.danger50 },
                { cmd: 'unlock' as const, icon: 'lock-open-outline' as const, label: 'Нээх', color: C.safe500, bg: C.safe50 },
                { cmd: 'locate' as const, icon: 'locate-outline' as const, label: 'Байршлыг олох', color: C.nest500, bg: C.nest50 },
                { cmd: 'sync' as const, icon: 'sync-outline' as const, label: 'Синхрончлох', color: C.warm500, bg: C.warm50 },
              ].map(({ cmd, icon, label, color, bg }) => (
                <View key={cmd} className="flex-1 items-center py-3 rounded-2xl" style={{ backgroundColor: bg }}>
                  <TouchableOpacity
                    onPress={() => sendCommand(device.id, cmd)}
                    disabled={commandingId === device.id}
                    className="p-1"
                  >
                    <Ionicons name={icon} size={20} color={color} />
                  </TouchableOpacity>
                  <Text className="text-[11px] text-gray-700 -mt-1">{label}</Text>
                </View>
              ))}
            </View>

            {commandingId === device.id && (
              <ActivityIndicator className="mt-2" color={C.nest500} />
            )}

            {/* Unpair */}
            <TouchableOpacity
              onPress={() => handleUnpair(device.id)}
              className="mt-3 py-2 flex-row items-center justify-center gap-x-1 bg-danger-50 rounded-2xl"
            >
              <Ionicons name="unlink-outline" size={16} color={C.danger500} />
              <Text className="text-sm font-medium text-danger-500">Холболт тасдах</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Pair New Device */}
      <TouchableOpacity
        onPress={() => navigation.navigate('PairDevice', { childId, childName })}
        className="bg-nest-500 rounded-2xl items-center justify-center mx-4 mt-2 flex-row gap-x-2 shadow-lg h-[52px]"
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text className="text-sm font-display font-bold text-white tracking-wide">
          Шинэ төхөөрөмж холбох
        </Text>
      </TouchableOpacity>

      <View className="h-8" />
    </ScrollView>
  );
}
