import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, RefreshControl, ActivityIndicator,
  Pressable, TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatTimeAgo } from '../../utils/formatters';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, CARD, LABEL } from '../../theme';
import type { Alert as AlertType } from '../../types';

const DOT_COLOR: Record<string, string> = {
  screen_time_limit: '#D97706',
  new_app_installed: '#a8a29e',
  blocked_content:   '#E11D48',
  geofence_trigger:  '#D97706',
  device_offline:    '#a8a29e',
  unusual_pattern:   '#D97706',
  uninstall_attempt: '#E11D48',
  sos:               '#f87171',
};

const TYPE_LABEL: Record<string, string> = {
  screen_time_limit: 'Дэлгэцийн цаг',
  new_app_installed: 'Апп',
  blocked_content:   'Хаагдсан',
  geofence_trigger:  'Байршил',
  device_offline:    'Төхөөрөмж',
  unusual_pattern:   'Үйл ажиллагаа',
  uninstall_attempt: 'Устгалт',
  sos:               'SOS',
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
    <Animated.View style={{
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: '#f87171', marginTop: 4, flexShrink: 0,
      opacity,
    }} />
  );
}

export default function AlertsScreen() {
  const { top } = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadAlerts = useCallback(async (pageNum = 1, append = false) => {
    try {
      const data = await api.getAlerts(pageNum, 20);
      setAlerts((prev) => append ? [...prev, ...data.alerts] : data.alerts);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      if (!append) showError(err, 'Мэдэгдэл ачаалахад алдаа гарлаа.');
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
      showError(err, 'Мэдэгдлийг уншсан болгоход алдаа гарлаа.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    } catch (err) {
      showError(err, 'Мэдэгдлүүдийг уншсан болгоход алдаа гарлаа.');
    }
  };

  const renderAlert = ({ item }: { item: AlertType }) => {
    const isSOS = item.type === 'sos';
    const dotColor = DOT_COLOR[item.type] || C.ink400;
    const typeLabel = TYPE_LABEL[item.type] || item.type;

    return (
      <Pressable onPress={() => handleMarkRead(item._id)} className="mb-3">
        {({ pressed }) => (
          <View style={{
            ...CARD,
            padding: 20,
            opacity: pressed ? 0.85 : 1,
            ...(isSOS ? { backgroundColor: C.ink900, borderColor: C.ink900 } : {}),
            ...((item.read || isSOS) ? {} : { borderLeftWidth: 3, borderLeftColor: C.ink900 }),
          }}>
            <View className="flex-row items-start gap-3">
              {isSOS
                ? <PulsingDot />
                : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor, marginTop: 4, flexShrink: 0 }} />
              }
              <View className="flex-1">
                <Text style={[LABEL, { color: isSOS ? C.ink600 : C.ink400, marginBottom: 6 }]}>
                  {typeLabel} · {formatTimeAgo(item.createdAt)}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: isSOS ? '#fff' : C.ink800, lineHeight: 20 }}>
                  {item.message}
                </Text>
                {Boolean(item.data?.childName) && (
                  <Text className="text-xs text-ink-400 mt-1">
                    {item.data?.childName as string}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-secondary" style={{ paddingTop: top * 2 }}>
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAlerts(1); }}
            tintColor={C.ink900}
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
          <View className="mt-6 mb-7 flex-row items-end justify-between">
            <View>
              <Text style={[LABEL, { marginBottom: 6 }]}>Мэдэгдэл</Text>
              <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>Мэдэгдлүүд</Text>
            </View>
            {alerts.some((a) => !a.read) && (
              <TouchableOpacity onPress={handleMarkAllRead} className="py-1">
                <Text className="text-xs text-ink-500 font-medium">Бүгдийг уншсан болгох</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator style={{ paddingVertical: 16 }} color={C.ink900} />
            : null
        }
        ListEmptyComponent={
          <View className="items-center pt-[60px] px-10">
            <View className="w-16 h-16 rounded-full bg-ink-100 items-center justify-center mb-4">
              <Ionicons name="notifications-outline" size={32} color={C.ink300} />
            </View>
            <Text className="text-sm font-semibold text-ink-500">Мэдэгдэл байхгүй</Text>
            <Text className="text-[13px] text-ink-400 text-center mt-1.5" style={{ lineHeight: 20 }}>
              Чухал үйл явдлын талаар энд мэдэгдэнэ.
            </Text>
          </View>
        }
      />
    </View>
  );
}
