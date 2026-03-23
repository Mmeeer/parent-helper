import React, { useCallback, useState, useEffect } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Surface, Text, Badge, Button, TouchableRipple } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ALERT_TYPE_LABELS, ALERT_TYPE_COLORS } from '../../utils/constants';
import { formatTimeAgo } from '../../utils/formatters';
import { colors } from '../../theme';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import type { Alert as AlertType } from '../../types';

const ALERT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  screen_time_limit: 'time-outline',
  new_app_installed: 'download-outline',
  blocked_content: 'shield-outline',
  geofence_trigger: 'location-outline',
  device_offline: 'phone-portrait-outline',
  unusual_pattern: 'warning-outline',
  uninstall_attempt: 'trash-outline',
};

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadAlerts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      const data = await api.getAlerts(pageNum, 20);
      if (append) {
        setAlerts((prev) => [...prev, ...data.alerts]);
      } else {
        setAlerts(data.alerts);
      }
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAlerts(1);
    }, [loadAlerts]),
  );

  useEffect(() => {
    const unsub = onSocketEvent('alert:new', () => {
      loadAlerts(1);
    });
    return unsub;
  }, [loadAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts(1);
  };

  const onEndReached = () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      loadAlerts(page + 1, true);
    }
  };

  const handleMarkRead = async (alertId: string) => {
    try {
      await api.markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, read: true } : a)),
      );
    } catch {
      // Handle silently
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch {
      // Handle silently
    }
  };

  const renderAlert = ({ item }: { item: AlertType }) => {
    const iconName = ALERT_ICONS[item.type] || 'alert-circle-outline';
    const color = ALERT_TYPE_COLORS[item.type] || colors.textMuted;

    return (
      <TouchableRipple
        onPress={() => handleMarkRead(item._id)}
        borderless
        className="rounded-2xl"
        rippleColor="rgba(79, 70, 229, 0.08)"
      >
        <Surface
          elevation={1}
          className={`flex-row rounded-2xl p-3.5 ${!item.read ? 'border-l-[3px] border-l-primary-600' : ''}`}
        >
          <View
            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: color + '20' }}
          >
            <Ionicons name={iconName} size={22} color={color} />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text variant="titleSmall" className="font-semibold text-slate-800">
                {ALERT_TYPE_LABELS[item.type] || item.type}
              </Text>
              <Text variant="labelSmall" className="text-slate-400">
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>

            <Text variant="bodySmall" className="text-slate-500 leading-[18px]" numberOfLines={2}>
              {item.message}
            </Text>

            {!item.read && (
              <Badge size={8} className="absolute top-0 right-0 bg-primary-600" />
            )}
          </View>
        </Surface>
      </TouchableRipple>
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
    <View className="flex-1 bg-surface-secondary">
      {alerts.some((a) => !a.read) && (
        <View className="items-end px-4 pt-2">
          <Button
            mode="text"
            compact
            textColor={colors.primary}
            onPress={handleMarkAllRead}
            labelStyle={{ fontSize: 14, fontWeight: '500' }}
          >
            Mark all as read
          </Button>
        </View>
      )}

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center pt-20 px-10">
            <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
            <Text variant="titleLarge" className="font-semibold text-slate-800 mt-4">
              No Alerts
            </Text>
            <Text variant="bodyMedium" className="text-slate-500 text-center mt-2">
              You'll be notified about important events here.
            </Text>
          </View>
        }
      />
    </View>
  );
}
