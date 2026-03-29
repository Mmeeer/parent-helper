import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../../theme';
import { formatDuration } from '../../utils/formatters';
import * as api from '../../services/api';
import type { DailyBreakdownEntry } from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ActivitySummary, AppUsageEntry } from '../../types';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'Reports'>;
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
      // 404 expected if no activity data yet
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
    const d = new Date(`${dateStr}T00:00:00`);
    const days = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
    return days[d.getDay()];
  };

  const formatShortDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${Number.parseInt(parts[1])}/${Number.parseInt(parts[2])}`;
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1.5">ТАЙЛАН</Text>
        <Text className="font-display font-bold text-[32px] text-gray-900 leading-9">
          {childName}-ийн тайлан
        </Text>
      </View>

      {/* Period Toggle */}
      <View className="flex-row mx-4 mb-5 gap-x-2">
        {(['week', 'month'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => { setPeriod(p); setLoading(true); }}
            className={`flex-1 rounded-2xl py-2.5 items-center ${
              period === p
                ? 'bg-nest-500'
                : 'bg-white border border-gray-200'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                period === p ? 'text-white' : 'text-gray-600'
              }`}
            >
              {p === 'week' ? 'Энэ долоо хоног' : 'Энэ сар'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      {summary && (
        <View className="flex-row mx-3 gap-x-2 mb-5">
          <View className="flex-1 bg-white rounded-2xl p-4 items-center mx-1 border border-gray-100">
            <Ionicons name="time-outline" size={24} color={C.nest500} />
            <Text className="font-display font-extrabold text-2xl text-gray-900 mt-1.5">
              {formatDuration(summary.totalScreenTimeMin)}
            </Text>
            <Text className="text-xs text-gray-400 font-semibold text-center mt-1">
              Нийт дэлгэцийн цаг
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 items-center mx-1 border border-gray-100">
            <Ionicons name="shield-outline" size={24} color={C.danger500} />
            <Text className="font-display font-extrabold text-2xl text-gray-900 mt-1.5">
              {summary.totalBlocked}
            </Text>
            <Text className="text-xs text-gray-400 font-semibold text-center mt-1">
              Хаагдсан
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 items-center mx-1 border border-gray-100">
            <Ionicons name="globe-outline" size={24} color={C.safe500} />
            <Text className="font-display font-extrabold text-2xl text-gray-900 mt-1.5">
              {summary.totalWebVisits}
            </Text>
            <Text className="text-xs text-gray-400 font-semibold text-center mt-1">
              Вэб зочилсон
            </Text>
          </View>
        </View>
      )}

      {/* Daily Screen Time Chart */}
      <View className="bg-white rounded-3xl p-4 mx-4 mb-3 shadow-sm border border-gray-100">
        <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3">ӨДРИЙН ДЭЛГЭЦИЙН ЦАГ</Text>
        <Text className="text-sm font-bold text-gray-900 mb-4">Өдрийн дэлгэцийн цаг</Text>
        <View className="flex-row items-end gap-x-1">
          {breakdown.map((day) => (
            <View key={day.date} className="flex-1 items-center">
              <View className="h-[120px] w-full justify-end items-center">
                <View className="w-[80%] rounded-full bg-gray-100 h-full justify-end">
                  <View
                    className="w-full rounded-full bg-nest-500"
                    style={{
                      height: `${Math.max((day.screenTimeMin / maxScreenTime) * 100, 2)}%`,
                      minHeight: 2,
                    }}
                  />
                </View>
              </View>
              <Text className="text-gray-400 mt-1.5 text-[10px]">
                {period === 'week' ? formatDate(day.date) : formatShortDate(day.date)}
              </Text>
              <Text className="text-gray-300 mt-0.5 text-[9px]">
                {day.screenTimeMin > 0 ? formatDuration(day.screenTimeMin) : '-'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Blocked Attempts */}
      <View className="bg-white rounded-3xl p-4 mx-4 mb-3 shadow-sm border border-gray-100">
        <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3">ХААЛТЫН ОРОЛДЛОГО</Text>
        <Text className="text-sm font-bold text-gray-900 mb-4">Хаалтын оролдлого</Text>
        {breakdown.filter((d) => d.blocked > 0).length === 0 ? (
          <Text className="text-sm text-gray-400 text-center py-5">
            Энэ хугацаанд хаалтын оролдлого байхгүй
          </Text>
        ) : (
          <View className="gap-y-2">
            {breakdown.filter((d) => d.blocked > 0).map((day) => (
              <View key={day.date} className="flex-row justify-between items-center py-1.5">
                <Text className="text-sm text-gray-900">
                  {day.date}
                </Text>
                <View className="bg-danger-50 px-3 py-1 rounded-xl">
                  <Text className="text-xs font-semibold text-danger-500">
                    {day.blocked}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Top Apps */}
      <View className="bg-white rounded-3xl p-4 mx-4 mb-3 shadow-sm border border-gray-100">
        <Text className="text-xs font-bold text-gray-400 tracking-wide mb-3">ХАМГИЙН ИХ ХЭРЭГЛЭСЭН АППУУД</Text>
        <Text className="text-sm font-bold text-gray-900 mb-4">Хамгийн их хэрэглэсэн аппууд</Text>
        {topApps.length === 0 ? (
          <Text className="text-sm text-gray-400 text-center py-5">
            Аппын хэрэглээний мэдээлэл байхгүй
          </Text>
        ) : (
          topApps.map((app, i) => {
            const maxTime = topApps[0]?.durationMin || 1;
            const pct = (app.durationMin / maxTime) * 100;
            return (
              <View key={app.packageName} className="flex-row items-center gap-x-3 py-2">
                <View className="w-8 h-8 rounded-xl bg-nest-50 justify-center items-center">
                  <Text className="text-xs font-bold text-gray-800">
                    {i + 1}
                  </Text>
                </View>
                <View className="flex-1 gap-y-1">
                  <Text className="text-xs font-bold text-gray-800" numberOfLines={1}>
                    {app.appName || app.packageName}
                  </Text>
                  <View className="h-1.5 rounded-full bg-gray-100">
                    <View
                      className="h-1.5 rounded-full bg-nest-500"
                      style={{ width: `${pct}%` }}
                    />
                  </View>
                </View>
                <Text className="text-xs font-semibold text-gray-500 min-w-[50px] text-right">
                  {formatDuration(app.durationMin)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View className="h-8" />
    </ScrollView>
  );
}
