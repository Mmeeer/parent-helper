import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { Text, Surface, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import { formatDuration, formatTimeAgo, formatTime } from '../../utils/formatters';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ActivitySummary, AppUsageEntry, DeviceStatus, WebEntry } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChildDetail'>;
  route: RouteProp<RootStackParamList, 'ChildDetail'>;
};

const PERIODS = ['day', 'week', 'month'] as const;

const ACTION_ITEMS = [
  { key: 'rules', label: 'Rules', icon: 'settings-outline' as const, color: '#4F46E5', route: 'RulesOverview' as const },
  { key: 'screentime', label: 'Screen Time', icon: 'time-outline' as const, color: '#D97706', route: 'ScreenTimeRules' as const },
  { key: 'location', label: 'Location', icon: 'location-outline' as const, color: '#E11D48', route: 'LocationMap' as const },
  { key: 'devices', label: 'Devices', icon: 'phone-portrait-outline' as const, color: '#0D9488', route: 'DevicesList' as const },
  { key: 'reports', label: 'Reports', icon: 'bar-chart-outline' as const, color: '#4F46E5', route: 'Reports' as const },
  { key: 'geofences', label: 'Geofences', icon: 'navigate-outline' as const, color: '#0EA5E9', route: 'Geofences' as const },
];

export default function ChildDetailScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [apps, setApps] = useState<AppUsageEntry[]>([]);
  const [webHistory, setWebHistory] = useState<WebEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [summaryData, appsData, webData] = await Promise.all([
        api.getActivitySummary(childId, period),
        api.getAppUsage(childId),
        api.getWebActivity(childId),
      ]);
      setSummary(summaryData);
      setApps(appsData);
      setWebHistory(webData);
    } catch {
      // May not have data yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId, period]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Send sync command to all child devices to get fresh data
      const devices = await api.getChildDevices(childId);
      await Promise.all(
        devices.map((d) => api.sendDeviceCommand(d.id, 'sync').catch(() => {})),
      );
      // Wait briefly for sync to complete, then reload
      setTimeout(() => loadData(), 2000);
    } catch {
      loadData();
    }
  }, [childId, loadData]);

  const handleBlockDomain = useCallback((domain: string) => {
    Alert.alert(
      'Block Domain',
      `Block "${domain}" on ${childName}'s devices?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const rules = await api.getRules(childId);
              const currentBlocked = rules.webFilter?.customBlock || [];
              if (!currentBlocked.includes(domain)) {
                await api.updateWebFilter(childId, {
                  customBlock: [...currentBlocked, domain],
                });
                Alert.alert('Blocked', `${domain} has been blocked.`);
              } else {
                Alert.alert('Already Blocked', `${domain} is already on the block list.`);
              }
            } catch {
              Alert.alert('Error', 'Failed to block domain.');
            }
          },
        },
      ],
    );
  }, [childId, childName]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    navigation.setOptions({ title: childName });
  }, [navigation, childName]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Period Selector */}
      <View className="mx-4 mt-4 flex-row rounded-xl bg-white p-1">
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            className={`flex-1 items-center rounded-lg py-2.5 ${
              period === p ? 'bg-primary-600' : ''
            }`}
            onPress={() => { setPeriod(p); setLoading(true); }}
          >
            <Text
              variant="bodyMedium"
              className={`font-medium ${period === p ? 'text-white' : 'text-slate-500'}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Summary Stats */}
      {summary && (
        <Surface className="mx-4 mt-4 rounded-2xl bg-white p-5" elevation={1}>
          <View className="flex-row">
            <View className="flex-1 items-center gap-1">
              <Text variant="titleMedium" className="font-bold text-slate-800">
                {formatDuration(summary.totalScreenTimeMin)}
              </Text>
              <Text variant="labelSmall" className="text-slate-500">
                Screen Time
              </Text>
            </View>
            <View className="w-px bg-slate-200" />
            <View className="flex-1 items-center gap-1">
              <Text variant="titleMedium" className="font-bold text-slate-800">
                {summary.totalBlocked}
              </Text>
              <Text variant="labelSmall" className="text-slate-500">
                Blocked
              </Text>
            </View>
            <View className="w-px bg-slate-200" />
            <View className="flex-1 items-center gap-1">
              <Text variant="titleMedium" className="font-bold text-slate-800">
                {summary.totalWebVisits}
              </Text>
              <Text variant="labelSmall" className="text-slate-500">
                Web Visits
              </Text>
            </View>
          </View>
        </Surface>
      )}

      {/* Quick Actions */}
      <Text variant="titleMedium" className="mx-4 mb-3 mt-6 font-bold text-slate-800">
        Manage
      </Text>
      <View className="mx-4 flex-row flex-wrap justify-between gap-y-2.5">
        {ACTION_ITEMS.map((action) => (
          <Pressable
            key={action.key}
            className="w-[48%]"
            onPress={() => navigation.navigate(action.route as any, { childId, childName })}
          >
            <Surface className="items-center gap-2 rounded-xl bg-white p-5" elevation={1}>
              <Ionicons name={action.icon} size={28} color={action.color} />
              <Text variant="bodyMedium" className="font-medium text-slate-700">
                {action.label}
              </Text>
            </Surface>
          </Pressable>
        ))}
      </View>

      {/* App Usage List */}
      <Text variant="titleMedium" className="mx-4 mb-3 mt-6 font-bold text-slate-800">
        Today's App Usage
      </Text>
      {apps.length === 0 ? (
        <Surface className="mx-4 items-center rounded-2xl bg-white p-6" elevation={1}>
          <Text variant="bodyMedium" className="text-slate-400">
            No app usage data for today
          </Text>
        </Surface>
      ) : (
        <Surface className="mx-4 rounded-2xl bg-white px-4" elevation={1}>
          {apps.map((app, index) => (
            <View
              key={`app-${app.packageName}-${index}`}
              className={`flex-row items-center gap-3 py-3 ${
                index < apps.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-secondary">
                <Ionicons name="apps" size={20} color={colors.primary} />
              </View>
              <Text variant="bodyMedium" className="flex-1 text-slate-700" numberOfLines={1}>
                {app.appName || app.packageName}
              </Text>
              <Text variant="bodyMedium" className="font-semibold text-slate-500">
                {formatDuration(app.durationMin)}
              </Text>
            </View>
          ))}
        </Surface>
      )}

      {/* Web History */}
      <Text variant="titleMedium" className="mx-4 mb-3 mt-6 font-bold text-slate-800">
        Web History
      </Text>
      {webHistory.length === 0 ? (
        <Surface className="mx-4 items-center rounded-2xl bg-white p-6" elevation={1}>
          <Text variant="bodyMedium" className="text-slate-400">
            No web activity recorded today
          </Text>
        </Surface>
      ) : (
        <Surface className="mx-4 rounded-2xl bg-white px-4" elevation={1}>
          {webHistory.slice(0, 20).map((entry, index) => (
            <Pressable
              key={`web-${entry.url}-${index}`}
              className={`flex-row items-center gap-3 py-3 ${
                index < Math.min(webHistory.length, 20) - 1 ? 'border-b border-slate-100' : ''
              }`}
              onPress={() => !entry.blocked && handleBlockDomain(entry.url)}
              onLongPress={() => handleBlockDomain(entry.url)}
            >
              <View
                className={`h-9 w-9 items-center justify-center rounded-lg ${
                  entry.blocked ? 'bg-danger-50' : 'bg-surface-secondary'
                }`}
              >
                <Ionicons
                  name={entry.blocked ? 'ban-outline' : 'globe-outline'}
                  size={20}
                  color={entry.blocked ? colors.danger : colors.primary}
                />
              </View>
              <View className="flex-1">
                <Text
                  variant="bodyMedium"
                  className={entry.blocked ? 'text-danger-600 line-through' : 'text-slate-700'}
                  numberOfLines={1}
                >
                  {entry.url}
                </Text>
                <Text variant="labelSmall" className="mt-0.5 text-slate-400">
                  {formatTime(entry.timestamp)}
                </Text>
              </View>
              {entry.blocked ? (
                <Chip
                  compact
                  textStyle={{ fontSize: 11, color: colors.danger }}
                  style={{ backgroundColor: '#FFF1F2' }}
                >
                  Blocked
                </Chip>
              ) : (
                <IconButton
                  icon={() => <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />}
                  size={18}
                  onPress={() => handleBlockDomain(entry.url)}
                  style={{ margin: 0 }}
                />
              )}
            </Pressable>
          ))}
          {webHistory.length > 20 && (
            <View className="items-center py-3">
              <Text variant="bodySmall" className="text-slate-400">
                +{webHistory.length - 20} more entries
              </Text>
            </View>
          )}
        </Surface>
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
