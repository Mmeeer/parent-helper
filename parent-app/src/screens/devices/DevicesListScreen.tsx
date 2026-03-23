import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Surface, Text, Button, Chip, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import { formatTimeAgo } from '../../utils/formatters';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, DeviceStatus } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DevicesList'>;
  route: RouteProp<RootStackParamList, 'DevicesList'>;
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
      Alert.alert('Command Sent', result.message);
      if (command === 'locate') {
        // Refresh device list after locate
        setTimeout(loadDevices, 3000);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send command.');
    } finally {
      setCommandingId(null);
    }
  };

  const handleUnpair = async (deviceId: string) => {
    Alert.alert(
      'Unpair Device',
      'Are you sure you want to remove this device? The child app will need to be re-paired.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.unpairDevice(deviceId);
              setDevices((prev) => prev.filter((d) => d.id !== deviceId));
              Alert.alert('Done', 'Device has been unpaired.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unpair device.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} />}
    >
      <Text variant="headlineSmall" className="font-bold text-slate-800 mx-4 mt-5 mb-4">
        Devices for {childName}
      </Text>

      {devices.length === 0 ? (
        <View className="items-center pt-16 px-10">
          <Ionicons name="phone-portrait-outline" size={64} color={colors.textMuted} />
          <Text variant="titleMedium" className="font-semibold text-slate-800 mt-4">
            No Devices Paired
          </Text>
          <Text variant="bodyMedium" className="text-slate-500 text-center mt-2">
            Pair a device to start monitoring.
          </Text>
        </View>
      ) : (
        devices.map((device) => (
          <Surface key={device.id} className="mx-4 mb-3 rounded-2xl p-4" elevation={1}>
            {/* Device Header */}
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-primary-50 justify-center items-center">
                <Ionicons name="phone-portrait" size={24} color={colors.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text variant="titleSmall" className="font-semibold text-slate-800">
                  {device.model || 'Unknown Device'}
                </Text>
                <Text variant="labelSmall" className="text-slate-500 mt-0.5">
                  {device.platform} {device.osVersion} — v{device.appVersion}
                </Text>
              </View>
              <View
                className={`flex-row items-center px-2.5 py-1 rounded-xl gap-x-1 ${
                  device.status === 'online' ? 'bg-accent-50' : 'bg-slate-100'
                }`}
              >
                <View
                  className={`w-2 h-2 rounded-full ${
                    device.status === 'online' ? 'bg-accent-600' : 'bg-slate-400'
                  }`}
                />
                <Text
                  variant="labelSmall"
                  className={`font-semibold capitalize ${
                    device.status === 'online' ? 'text-accent-600' : 'text-slate-400'
                  }`}
                >
                  {device.status}
                </Text>
              </View>
            </View>

            {/* Device Stats */}
            <View className="flex-row gap-x-2.5 mt-3">
              {device.batteryLevel != null && (
                <Chip
                  icon={() => (
                    <Ionicons
                      name={device.batteryLevel! > 20 ? 'battery-half' : 'battery-dead'}
                      size={16}
                      color={device.batteryLevel! > 20 ? colors.secondary : colors.danger}
                    />
                  )}
                  className="bg-surface-tertiary"
                  textStyle={{ fontSize: 12, color: colors.textSecondary }}
                  compact
                >
                  {device.batteryLevel}%
                </Chip>
              )}
              <Chip
                icon={() => (
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                )}
                className="bg-surface-tertiary"
                textStyle={{ fontSize: 12, color: colors.textSecondary }}
                compact
              >
                {device.lastSeen ? formatTimeAgo(device.lastSeen) : 'Never'}
              </Chip>
            </View>

            {/* Remote Commands */}
            <Text variant="labelMedium" className="font-semibold text-slate-500 mt-4 mb-2">
              Remote Commands
            </Text>
            <View className="flex-row gap-x-2">
              <View className="flex-1 items-center py-3 rounded-xl bg-surface-tertiary">
                <IconButton
                  icon={() => <Ionicons name="lock-closed-outline" size={20} color={colors.danger} />}
                  size={20}
                  onPress={() => sendCommand(device.id, 'lock')}
                  disabled={commandingId === device.id}
                  className="m-0 p-0"
                />
                <Text variant="labelSmall" className="text-slate-700 -mt-1">Lock</Text>
              </View>
              <View className="flex-1 items-center py-3 rounded-xl bg-surface-tertiary">
                <IconButton
                  icon={() => <Ionicons name="lock-open-outline" size={20} color={colors.secondary} />}
                  size={20}
                  onPress={() => sendCommand(device.id, 'unlock')}
                  disabled={commandingId === device.id}
                  className="m-0 p-0"
                />
                <Text variant="labelSmall" className="text-slate-700 -mt-1">Unlock</Text>
              </View>
              <View className="flex-1 items-center py-3 rounded-xl bg-surface-tertiary">
                <IconButton
                  icon={() => <Ionicons name="locate-outline" size={20} color={colors.primary} />}
                  size={20}
                  onPress={() => sendCommand(device.id, 'locate')}
                  disabled={commandingId === device.id}
                  className="m-0 p-0"
                />
                <Text variant="labelSmall" className="text-slate-700 -mt-1">Locate</Text>
              </View>
              <View className="flex-1 items-center py-3 rounded-xl bg-surface-tertiary">
                <IconButton
                  icon={() => <Ionicons name="sync-outline" size={20} color={colors.warning} />}
                  size={20}
                  onPress={() => sendCommand(device.id, 'sync')}
                  disabled={commandingId === device.id}
                  className="m-0 p-0"
                />
                <Text variant="labelSmall" className="text-slate-700 -mt-1">Sync</Text>
              </View>
            </View>

            {commandingId === device.id && (
              <ActivityIndicator className="mt-2" color={colors.primary} />
            )}

            {/* Unpair */}
            <Button
              mode="text"
              icon={() => <Ionicons name="unlink-outline" size={16} color={colors.danger} />}
              onPress={() => handleUnpair(device.id)}
              textColor={colors.danger}
              className="mt-3"
              compact
            >
              Unpair Device
            </Button>
          </Surface>
        ))
      )}

      {/* Pair New Device */}
      <Surface className="mx-4 mt-2 rounded-2xl" elevation={0}>
        <Button
          mode="outlined"
          icon={() => <Ionicons name="add-circle-outline" size={20} color={colors.primary} />}
          onPress={() => navigation.navigate('PairDevice', { childId, childName })}
          textColor={colors.primary}
          className="rounded-2xl py-1"
        >
          Pair New Device
        </Button>
      </Surface>

      <View className="h-8" />
    </ScrollView>
  );
}
