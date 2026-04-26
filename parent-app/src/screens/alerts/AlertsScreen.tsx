import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, RefreshControl, ActivityIndicator,
  Pressable, TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { formatTimeAgo } from '../../utils/formatters';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Alert as AlertType } from '../../types';
import { useTranslation } from 'react-i18next';
import { C } from '../../theme';

type AlertCategory = 'all' | 'location' | 'app' | 'web' | 'sos';

const CATEGORY_MAP: Record<string, AlertCategory> = {
  geofence_trigger: 'location',
  new_app_installed: 'app',
  uninstall_attempt: 'app',
  blocked_content: 'web',
  screen_time_limit: 'app',
  device_offline: 'app',
  unusual_pattern: 'app',
  sos: 'sos',
};

const ICON_CONFIG: Record<string, { name: string; bgClass: string; iconColor: string }> = {
  geofence_trigger:  { name: 'location-outline',      bgClass: 'bg-warm-50',   iconColor: '#D97706' },
  new_app_installed: { name: 'apps-outline',           bgClass: 'bg-purple-50', iconColor: '#9333EA' },
  blocked_content:   { name: 'shield-outline',         bgClass: 'bg-danger-50', iconColor: '#E11D48' },
  screen_time_limit: { name: 'time-outline',           bgClass: 'bg-warm-50',   iconColor: '#D97706' },
  device_offline:    { name: 'phone-portrait-outline',  bgClass: 'bg-nest-50',  iconColor: '#0D9488' },
  unusual_pattern:   { name: 'trending-up-outline',    bgClass: 'bg-warm-50',   iconColor: '#D97706' },
  uninstall_attempt: { name: 'trash-outline',          bgClass: 'bg-danger-50', iconColor: '#E11D48' },
  sos:               { name: 'alert-circle-outline',   bgClass: 'bg-white/20',  iconColor: '#FFFFFF' },
};

const BADGE_STYLE: Record<string, { textClass: string; bgClass: string }> = {
  geofence_trigger:  { textClass: 'text-warm-600',   bgClass: 'bg-warm-50' },
  new_app_installed: { textClass: 'text-purple-600', bgClass: 'bg-purple-50' },
  blocked_content:   { textClass: 'text-danger-600', bgClass: 'bg-danger-50' },
  screen_time_limit: { textClass: 'text-warm-600',   bgClass: 'bg-warm-50' },
  device_offline:    { textClass: 'text-nest-600',   bgClass: 'bg-nest-50' },
  unusual_pattern:   { textClass: 'text-warm-600',   bgClass: 'bg-warm-50' },
  uninstall_attempt: { textClass: 'text-danger-600', bgClass: 'bg-danger-50' },
  sos:               { textClass: 'text-white',      bgClass: 'bg-white/20' },
};

// Pulsing dot for SOS alerts
function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      className="w-2.5 h-2.5 rounded-full bg-white mt-1"
      style={{ opacity }}
    />
  );
}

function isYesterday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function AlertsScreen() {
  const { top } = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation();

  const FILTERS: { key: AlertCategory; label: string }[] = [
    { key: 'all', label: t('alerts.all') },
    { key: 'location', label: t('alerts.location') },
    { key: 'app', label: t('alerts.app') },
    { key: 'web', label: t('alerts.web') },
    { key: 'sos', label: 'SOS' },
  ];

  const TYPE_LABEL: Record<string, string> = {
    screen_time_limit: t('alerts.screenTime'),
    new_app_installed: t('alerts.app'),
    blocked_content: t('alerts.blocked'),
    geofence_trigger: t('alerts.location'),
    device_offline: t('alerts.device'),
    unusual_pattern: t('alerts.activity'),
    uninstall_attempt: t('alerts.uninstall'),
    sos: 'SOS',
  };
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AlertCategory>('all');

  const loadAlerts = useCallback(async (pageNum = 1, append = false) => {
    try {
      const data = await api.getAlerts(pageNum, 20);
      setAlerts((prev) => append ? [...prev, ...data.alerts] : data.alerts);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      if (!append) showError(err, t('alerts.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAlerts(1); }, [loadAlerts]));

  useEffect(() => {
    const unsub = onSocketEvent('alert:new', () => loadAlerts(1));
    return unsub;
  }, [loadAlerts]);

  const handleMarkRead = async (alertId: string) => {
    try {
      await api.markAlertRead(alertId);
      setAlerts((prev) => prev.map((a) => a._id === alertId ? { ...a, read: true } : a));
    } catch (err) {
      showError(err, t('alerts.markReadError'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (err) {
      showError(err, t('alerts.markAllReadError'));
    }
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    navigation.setOptions({ tabBarBadge: unreadCount > 0 ? unreadCount : undefined });
  }, [unreadCount, navigation]);

  const filteredAlerts = activeFilter === 'all'
    ? alerts
    : alerts.filter((a) => CATEGORY_MAP[a.type] === activeFilter);

  const renderAlert = ({ item, index }: { item: AlertType; index: number }) => {
    const isSOS = item.type === 'sos';
    const typeLabel = TYPE_LABEL[item.type] || item.type;
    const icon = ICON_CONFIG[item.type] || ICON_CONFIG.device_offline;
    const badge = BADGE_STYLE[item.type] || BADGE_STYLE.device_offline;

    // Determine if we need a "Yesterday" section header
    const isYesterdayItem = !isToday(item.createdAt) && isYesterday(item.createdAt);
    const prevItem = index > 0 ? filteredAlerts[index - 1] : null;
    const showYesterdayHeader = isYesterdayItem && (!prevItem || isToday(prevItem.createdAt));
    const isOlderItem = !isToday(item.createdAt);

    return (
      <View className={isOlderItem ? 'opacity-60' : ''}>
        {showYesterdayHeader && (
          <Text className="text-xs text-gray-400 font-bold mb-3 mt-2">{t('common.yesterday')}</Text>
        )}
        <Pressable onPress={() => handleMarkRead(item._id)} className="mb-3">
          {({ pressed }) => (
            isSOS ? (
              /* SOS alert card with gradient */
              <View
                className={`rounded-3xl p-4 bg-danger-500 ${pressed ? 'opacity-85' : 'opacity-100'}`}
              >
                <View className="flex-row items-start gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center">
                    <Ionicons name="alert-circle-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className="bg-white/20 rounded-full px-2 py-0.5">
                        <Text className="text-white text-[10px] font-bold">{typeLabel}</Text>
                      </View>
                      <PulsingDot />
                      <Text className="text-[10px] text-white/60">{formatTimeAgo(item.createdAt)}</Text>
                    </View>
                    <Text className="text-sm font-bold text-white">{item.message}</Text>
                    {Boolean(item.data?.childName) && (
                      <Text className="text-xs text-white/70 mt-1">
                        {item.data?.childName as string}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              /* Regular alert card */
              <View
                className={`bg-white rounded-3xl p-4 border border-gray-100 shadow-sm ${pressed ? 'opacity-85' : 'opacity-100'}`}
              >
                <View className="flex-row items-start gap-3">
                  <View className={`w-10 h-10 rounded-2xl items-center justify-center ${icon.bgClass}`}>
                    <Ionicons name={icon.name as any} size={22} color={icon.iconColor} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <View className={`rounded-full px-2 py-0.5 ${badge.bgClass}`}>
                        <Text className={`text-[10px] font-bold ${badge.textClass}`}>{typeLabel}</Text>
                      </View>
                      <Text className="text-[10px] text-gray-400">{formatTimeAgo(item.createdAt)}</Text>
                      {!item.read && (
                        <View className="w-1.5 h-1.5 rounded-full bg-danger-500" />
                      )}
                    </View>
                    <Text className="text-sm font-bold text-gray-900">{item.message}</Text>
                    {Boolean(item.data?.childName) && (
                      <Text className="text-xs text-gray-500 mt-1">
                        {item.data?.childName as string}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )
          )}
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: top * 2 }}>
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-5 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAlerts(1); }}
            tintColor="#0D9488"
          />
        }
        onEndReached={() => {
          if (page < totalPages && !loadingMore) {
            setLoadingMore(true);
            loadAlerts(page + 1, true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View className="mt-4 mb-5">
            {/* Page header */}
            <View className="flex-row items-end justify-between mb-4">
              <View>
                <Text className="font-display font-extrabold text-xl text-gray-900">{t('alerts.title')}</Text>
                <Text className="text-sm text-gray-400">
                  {unreadCount > 0 ? t('alerts.unread', { count: unreadCount }) : t('alerts.allRead')}
                </Text>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} className="py-1">
                  <Text className="text-xs text-nest-500 font-bold">{t('alerts.markAllRead')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Filter chips */}
            <View className="flex-row gap-2">
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-2xl ${
                    activeFilter === f.key
                      ? 'bg-nest-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeFilter === f.key
                        ? 'text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator className="py-4" color={C.nest500} />
            : null
        }
        ListEmptyComponent={
          <View className="items-center pt-[60px] px-10">
            <View className="w-16 h-16 rounded-2xl bg-nest-50 items-center justify-center mb-4">
              <Ionicons name="notifications-outline" size={32} color={C.nest500} />
            </View>
            <Text className="text-sm font-bold text-gray-900">{t('alerts.noAlerts')}</Text>
            <Text className="text-xs text-gray-500 text-center mt-1.5 leading-5">
              {t('alerts.noAlertsDesc')}
            </Text>
          </View>
        }
      />
    </View>
  );
}
