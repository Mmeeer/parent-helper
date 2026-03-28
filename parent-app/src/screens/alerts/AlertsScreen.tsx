import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ALERT_TYPE_LABELS, ALERT_TYPE_COLORS } from '../../utils/constants';
import { formatTimeAgo } from '../../utils/formatters';
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
    const color = ALERT_TYPE_COLORS[item.type] || '#94A3B8';

    return (
      <Pressable
        onPress={() => handleMarkRead(item._id)}
      >
        <View
          className={`flex-row rounded-2xl p-3.5 bg-white shadow-sm shadow-black/5 ${!item.read ? 'border-l-[3px] border-l-primary-600' : ''}`}
        >
          <View
            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: color + '20' }}
          >
            <Ionicons name={iconName} size={22} color={color} />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-sm font-semibold text-slate-800">
                {ALERT_TYPE_LABELS[item.type] || item.type}
              </Text>
              <Text className="text-[11px] text-slate-400">
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>

            <Text className="text-xs text-slate-500 leading-[18px]" numberOfLines={2}>
              {item.message}
            </Text>

            {!item.read && (
              <View className="w-2 h-2 rounded-full bg-primary-600 absolute top-0 right-0" />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-secondary">
      {alerts.some((a) => !a.read) && (
        <View className="items-end px-4 pt-2">
          <TouchableOpacity
            onPress={handleMarkAllRead}
            className="py-2"
          >
            <Text className="text-primary-600 font-medium text-sm">Mark all as read</Text>
          </TouchableOpacity>
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
            <ActivityIndicator style={{ paddingVertical: 16 }} color="#4F46E5" />
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center pt-20 px-10">
            <Ionicons name="notifications-off-outline" size={64} color="#94A3B8" />
            <Text className="text-lg font-bold text-slate-800 mt-4">
              No Alerts
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-2">
              You'll be notified about important events here.
            </Text>
          </View>
        }
      />
    </View>
  );
}
