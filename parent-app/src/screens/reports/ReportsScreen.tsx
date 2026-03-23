import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Surface, Text, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import { formatDuration } from '../../utils/formatters';
import * as api from '../../services/api';
import type { DailyBreakdownEntry } from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ActivitySummary, AppUsageEntry } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Reports'>;
  route: RouteProp<RootStackParamList, 'Reports'>;
};

export default function ReportsScreen({ route }: Props) {
  const { childId, childName } = route.params;
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [breakdown, setBreakdown] = useState<DailyBreakdownEntry[]>([]);
  const [topApps, setTopApps] = useState<AppUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const days = period === 'week' ? 7 : 30;
      const [summaryData, breakdownData] = await Promise.all([
        api.getActivitySummary(childId, period),
        api.getDailyBreakdown(childId, days),
      ]);
      setSummary(summaryData);
      setBreakdown(breakdownData.breakdown);
      setTopApps(summaryData.topApps || []);
    } catch {
      // May not have data yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId, period]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const maxScreenTime = Math.max(...breakdown.map((d) => d.screenTimeMin), 1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  };

  const formatShortDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <Text variant="headlineSmall" className="font-bold text-slate-800 mx-4 mt-5 mb-4">
        Reports for {childName}
      </Text>

      {/* Period Toggle */}
      <View className="flex-row mx-4 bg-white rounded-xl p-1 mb-4">
        {(['week', 'month'] as const).map((p) => (
          <View
            key={p}
            className={`flex-1 rounded-lg ${period === p ? 'bg-primary-600' : ''}`}
          >
            <Chip
              selected={period === p}
              onPress={() => { setPeriod(p); setLoading(true); }}
              showSelectedCheck={false}
              className={`rounded-lg ${period === p ? 'bg-primary-600' : 'bg-transparent'}`}
              textStyle={{
                color: period === p ? colors.white : colors.textSecondary,
                fontWeight: '500',
                fontSize: 14,
                textAlign: 'center',
                width: '100%',
              }}
              style={{ alignItems: 'center' }}
            >
              {p === 'week' ? 'This Week' : 'This Month'}
            </Chip>
          </View>
        ))}
      </View>

      {/* Summary Cards */}
      {summary && (
        <View className="flex-row mx-3 gap-x-2 mb-4">
          <Surface className="flex-1 rounded-2xl p-3.5 items-center bg-primary-50 mx-1" elevation={0}>
            <Ionicons name="time-outline" size={24} color={colors.primary} />
            <Text variant="titleMedium" className="font-bold text-slate-800 mt-1.5">
              {formatDuration(summary.totalScreenTimeMin)}
            </Text>
            <Text variant="labelSmall" className="text-slate-500 text-center mt-1">
              Total Screen Time
            </Text>
          </Surface>
          <Surface className="flex-1 rounded-2xl p-3.5 items-center bg-danger-50 mx-1" elevation={0}>
            <Ionicons name="shield-outline" size={24} color={colors.danger} />
            <Text variant="titleMedium" className="font-bold text-slate-800 mt-1.5">
              {summary.totalBlocked}
            </Text>
            <Text variant="labelSmall" className="text-slate-500 text-center mt-1">
              Blocked
            </Text>
          </Surface>
          <Surface className="flex-1 rounded-2xl p-3.5 items-center bg-accent-50 mx-1" elevation={0}>
            <Ionicons name="globe-outline" size={24} color={colors.secondary} />
            <Text variant="titleMedium" className="font-bold text-slate-800 mt-1.5">
              {summary.totalWebVisits}
            </Text>
            <Text variant="labelSmall" className="text-slate-500 text-center mt-1">
              Web Visits
            </Text>
          </Surface>
        </View>
      )}

      {/* Daily Screen Time Chart */}
      <Surface className="mx-4 mb-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleSmall" className="font-semibold text-slate-800 mb-4">
          Daily Screen Time
        </Text>
        <View className="flex-row items-end gap-x-1">
          {breakdown.map((day, i) => (
            <View key={i} className="flex-1 items-center">
              <View className="h-[120px] w-full justify-end items-center">
                <View
                  className="w-[60%] rounded"
                  style={{
                    height: `${Math.max((day.screenTimeMin / maxScreenTime) * 100, 2)}%`,
                    backgroundColor: day.screenTimeMin > 180 ? colors.danger : colors.primary,
                    minHeight: 2,
                  }}
                />
              </View>
              <Text variant="labelSmall" className="text-slate-400 mt-1.5" style={{ fontSize: 10 }}>
                {period === 'week' ? formatDate(day.date) : formatShortDate(day.date)}
              </Text>
              <Text variant="labelSmall" className="text-slate-300 mt-0.5" style={{ fontSize: 9 }}>
                {day.screenTimeMin > 0 ? formatDuration(day.screenTimeMin) : '-'}
              </Text>
            </View>
          ))}
        </View>
      </Surface>

      {/* Blocked Attempts */}
      <Surface className="mx-4 mb-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleSmall" className="font-semibold text-slate-800 mb-4">
          Blocked Attempts
        </Text>
        {breakdown.filter((d) => d.blocked > 0).length === 0 ? (
          <Text variant="bodyMedium" className="text-slate-400 text-center py-5">
            No blocked attempts in this period
          </Text>
        ) : (
          <View className="gap-y-2">
            {breakdown.filter((d) => d.blocked > 0).map((day, i) => (
              <View key={i} className="flex-row justify-between items-center py-1.5">
                <Text variant="bodyMedium" className="text-slate-800">
                  {day.date}
                </Text>
                <View className="bg-danger-50 px-3 py-1 rounded-xl">
                  <Text variant="labelMedium" className="font-semibold text-danger-600">
                    {day.blocked}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Surface>

      {/* Top Apps */}
      <Surface className="mx-4 mb-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleSmall" className="font-semibold text-slate-800 mb-4">
          Top Apps
        </Text>
        {topApps.length === 0 ? (
          <Text variant="bodyMedium" className="text-slate-400 text-center py-5">
            No app usage data
          </Text>
        ) : (
          topApps.map((app, i) => {
            const maxTime = topApps[0]?.durationMin || 1;
            const pct = (app.durationMin / maxTime) * 100;
            return (
              <View key={i} className="flex-row items-center gap-x-3 py-2">
                <View className="w-7 h-7 rounded-full bg-surface-tertiary justify-center items-center">
                  <Text variant="labelSmall" className="font-semibold text-slate-500">
                    {i + 1}
                  </Text>
                </View>
                <View className="flex-1 gap-y-1">
                  <Text variant="bodyMedium" className="font-medium text-slate-800" numberOfLines={1}>
                    {app.appName || app.packageName}
                  </Text>
                  <View className="h-1.5 bg-surface-tertiary rounded-full">
                    <View
                      className="h-1.5 bg-primary-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </View>
                </View>
                <Text variant="labelLarge" className="font-semibold text-slate-500 min-w-[50px] text-right">
                  {formatDuration(app.durationMin)}
                </Text>
              </View>
            );
          })
        )}
      </Surface>

      <View className="h-8" />
    </ScrollView>
  );
}
