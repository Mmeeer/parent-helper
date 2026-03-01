import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDevices(); }} />}
    >
      <Text style={styles.header}>Devices for {childName}</Text>

      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="phone-portrait-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Devices Paired</Text>
          <Text style={styles.emptySubtitle}>
            Pair a device to start monitoring.
          </Text>
        </View>
      ) : (
        devices.map((device) => (
          <View key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <View style={styles.deviceIcon}>
                <Ionicons name="phone-portrait" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceModel}>{device.model || 'Unknown Device'}</Text>
                <Text style={styles.deviceMeta}>
                  {device.platform} {device.osVersion} — v{device.appVersion}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: device.status === 'online' ? COLORS.online + '20' : '#F5F5F5' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: device.status === 'online' ? COLORS.online : COLORS.offline },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: device.status === 'online' ? COLORS.online : COLORS.offline },
                  ]}
                >
                  {device.status}
                </Text>
              </View>
            </View>

            {/* Device Stats */}
            <View style={styles.statsRow}>
              {device.batteryLevel != null && (
                <View style={styles.statChip}>
                  <Ionicons
                    name={device.batteryLevel > 20 ? 'battery-half' : 'battery-dead'}
                    size={16}
                    color={device.batteryLevel > 20 ? COLORS.secondary : COLORS.danger}
                  />
                  <Text style={styles.statChipText}>{device.batteryLevel}%</Text>
                </View>
              )}
              <View style={styles.statChip}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.statChipText}>
                  {device.lastSeen ? formatTimeAgo(device.lastSeen) : 'Never'}
                </Text>
              </View>
            </View>

            {/* Remote Commands */}
            <Text style={styles.commandsLabel}>Remote Commands</Text>
            <View style={styles.commandsRow}>
              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => sendCommand(device.id, 'lock')}
                disabled={commandingId === device.id}
              >
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.danger} />
                <Text style={styles.commandText}>Lock</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => sendCommand(device.id, 'unlock')}
                disabled={commandingId === device.id}
              >
                <Ionicons name="lock-open-outline" size={20} color={COLORS.secondary} />
                <Text style={styles.commandText}>Unlock</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => sendCommand(device.id, 'locate')}
                disabled={commandingId === device.id}
              >
                <Ionicons name="locate-outline" size={20} color={COLORS.primary} />
                <Text style={styles.commandText}>Locate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandButton}
                onPress={() => sendCommand(device.id, 'sync')}
                disabled={commandingId === device.id}
              >
                <Ionicons name="sync-outline" size={20} color={COLORS.warning} />
                <Text style={styles.commandText}>Sync</Text>
              </TouchableOpacity>
            </View>

            {commandingId === device.id && (
              <ActivityIndicator style={{ marginTop: 8 }} color={COLORS.primary} />
            )}

            {/* Unpair */}
            <TouchableOpacity
              style={styles.unpairButton}
              onPress={() => handleUnpair(device.id)}
            >
              <Ionicons name="unlink-outline" size={16} color={COLORS.danger} />
              <Text style={styles.unpairText}>Unpair Device</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Pair New Device */}
      <TouchableOpacity
        style={styles.pairButton}
        onPress={() => navigation.navigate('PairDevice', { childId, childName })}
      >
        <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
        <Text style={styles.pairButtonText}>Pair New Device</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginHorizontal: 16, marginTop: 20, marginBottom: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  deviceCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  deviceHeader: { flexDirection: 'row', alignItems: 'center' },
  deviceIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  deviceInfo: { flex: 1, marginLeft: 12 },
  deviceModel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  deviceMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  statChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  commandsLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 16, marginBottom: 8 },
  commandsRow: { flexDirection: 'row', gap: 8 },
  commandButton: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.background, gap: 4,
  },
  commandText: { fontSize: 11, fontWeight: '500', color: COLORS.text },
  unpairButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 8 },
  unpairText: { fontSize: 13, color: COLORS.danger, fontWeight: '500' },
  pairButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, paddingVertical: 16, backgroundColor: COLORS.white, borderRadius: 14 },
  pairButtonText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
});
