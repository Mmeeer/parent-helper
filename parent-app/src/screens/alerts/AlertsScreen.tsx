import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, ALERT_TYPE_LABELS, ALERT_TYPE_COLORS } from '../../utils/constants';
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
    const color = ALERT_TYPE_COLORS[item.type] || COLORS.textSecondary;

    return (
      <TouchableOpacity
        style={[styles.alertCard, !item.read && styles.alertUnread]}
        onPress={() => handleMarkRead(item._id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={iconName} size={22} color={color} />
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertType}>
              {ALERT_TYPE_LABELS[item.type] || item.type}
            </Text>
            <Text style={styles.alertTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.alertMessage} numberOfLines={2}>
            {item.message}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
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
    <View style={styles.container}>
      {alerts.some((a) => !a.read) && (
        <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} color={COLORS.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Alerts</Text>
            <Text style={styles.emptySubtitle}>
              You'll be notified about important events here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  markAllButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    marginRight: 16,
  },
  markAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertUnread: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
