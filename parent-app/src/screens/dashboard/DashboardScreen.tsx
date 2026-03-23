import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Surface, Avatar, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import { formatDuration } from '../../utils/formatters';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import type { DailyBreakdownEntry } from '../../services/api';
import type { Child, ActivitySummary, Alert as AlertType } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function DashboardScreen({ navigation }: Props) {
  const [children, setChildren] = useState<Child[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ActivitySummary>>({});
  const [breakdowns, setBreakdowns] = useState<Record<string, DailyBreakdownEntry[]>>({});
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [childrenData, alertsData] = await Promise.all([
        api.getChildren(),
        api.getAlerts(1, 5, true),
      ]);
      setChildren(childrenData);
      setAlerts(alertsData.alerts);

      // Load summaries and breakdowns for each child
      const summaryMap: Record<string, ActivitySummary> = {};
      const breakdownMap: Record<string, DailyBreakdownEntry[]> = {};
      await Promise.all(
        childrenData.map(async (child) => {
          try {
            const [sum, bd] = await Promise.all([
              api.getActivitySummary(child._id, 'day'),
              api.getDailyBreakdown(child._id, 7),
            ]);
            summaryMap[child._id] = sum;
            breakdownMap[child._id] = bd.breakdown;
          } catch {
            // Child may not have activity yet
          }
        }),
      );
      setSummaries(summaryMap);
      setBreakdowns(breakdownMap);
    } catch {
      // Handle error silently on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    const unsub = onSocketEvent('alert:new', () => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Unread Alerts Banner */}
      {alerts.length > 0 && (
        <Pressable
          className="mx-4 mt-4 flex-row items-center gap-2 rounded-xl bg-warning-50 px-4 py-3"
          onPress={() => {}}
        >
          <Ionicons name="notifications" size={20} color={colors.warning} />
          <Text variant="bodyMedium" className="flex-1 font-medium text-slate-800">
            {alerts.length} unread alert{alerts.length > 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      )}

      {/* Children Cards */}
      {children.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10 pt-24">
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text variant="titleLarge" className="mt-4 font-semibold text-slate-800">
            No Children Added
          </Text>
          <Text variant="bodyMedium" className="mb-6 mt-2 text-center text-slate-500">
            Add a child profile to start monitoring.
          </Text>
          <Button
            mode="contained"
            icon={() => <Ionicons name="add" size={18} color={colors.white} />}
            onPress={() => navigation.navigate('AddChild')}
            className="rounded-xl"
            buttonColor={colors.primary}
          >
            Add Child
          </Button>
        </View>
      ) : (
        <>
          <Text variant="titleLarge" className="mx-4 mb-3 mt-5 font-bold text-slate-800">
            Today's Overview
          </Text>
          {children.map((child) => {
            const summary = summaries[child._id];
            const childBreakdown = breakdowns[child._id] || [];
            return (
              <Pressable
                key={child._id}
                onPress={() =>
                  navigation.navigate('ChildDetail', {
                    childId: child._id,
                    childName: child.name,
                  })
                }
              >
                <Surface
                  className="mx-4 mb-3 rounded-2xl bg-white p-4"
                  elevation={1}
                >
                  {/* Child Header */}
                  <View className="mb-4 flex-row items-center">
                    <Avatar.Text
                      size={44}
                      label={child.name.charAt(0).toUpperCase()}
                      color="#FFFFFF"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <View className="ml-3 flex-1">
                      <Text variant="titleMedium" className="font-semibold text-slate-800">
                        {child.name}
                      </Text>
                      <Text variant="bodySmall" className="mt-0.5 text-slate-500">
                        Age {child.age}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>

                  {/* Stats Row */}
                  {summary ? (
                    <View className="flex-row items-center rounded-xl bg-surface-secondary px-2 py-3">
                      <View className="flex-1 items-center gap-1">
                        <Ionicons name="time-outline" size={18} color={colors.primary} />
                        <Text variant="titleSmall" className="font-bold text-slate-800">
                          {formatDuration(summary.totalScreenTimeMin)}
                        </Text>
                        <Text variant="labelSmall" className="text-slate-500">
                          Screen Time
                        </Text>
                      </View>
                      <View className="h-8 w-px bg-slate-200" />
                      <View className="flex-1 items-center gap-1">
                        <Ionicons name="apps-outline" size={18} color={colors.secondary} />
                        <Text variant="titleSmall" className="font-bold text-slate-800">
                          {summary.topApps.length}
                        </Text>
                        <Text variant="labelSmall" className="text-slate-500">
                          Apps Used
                        </Text>
                      </View>
                      <View className="h-8 w-px bg-slate-200" />
                      <View className="flex-1 items-center gap-1">
                        <Ionicons name="shield-outline" size={18} color={colors.danger} />
                        <Text variant="titleSmall" className="font-bold text-slate-800">
                          {summary.totalBlocked}
                        </Text>
                        <Text variant="labelSmall" className="text-slate-500">
                          Blocked
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text variant="bodySmall" className="py-3 text-center text-slate-400">
                      No activity data yet
                    </Text>
                  )}

                  {/* Weekly Screen Time Mini Chart */}
                  {childBreakdown.length > 0 && (
                    <View className="mt-3 border-t border-slate-100 pt-3">
                      <Text variant="labelMedium" className="mb-2 font-semibold text-slate-500">
                        This Week
                      </Text>
                      <View className="flex-row items-end gap-1">
                        {childBreakdown.map((day, i) => {
                          const maxMin = Math.max(...childBreakdown.map((d) => d.screenTimeMin), 1);
                          const pct = Math.max((day.screenTimeMin / maxMin) * 100, 3);
                          const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(day.date + 'T00:00:00').getDay()];
                          return (
                            <View key={i} className="flex-1 items-center">
                              <View className="h-12 w-[70%] items-center justify-end">
                                <View
                                  className="w-full rounded-sm"
                                  style={{
                                    height: `${pct}%`,
                                    backgroundColor: day.screenTimeMin > 180 ? colors.warning : colors.primary,
                                    minHeight: 2,
                                  }}
                                />
                              </View>
                              <Text variant="labelSmall" className="mt-1 text-slate-400" style={{ fontSize: 10 }}>
                                {dayLabel}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Top Apps */}
                  {summary && summary.topApps.length > 0 && (
                    <View className="mt-3">
                      <Text variant="labelMedium" className="mb-2 font-semibold text-slate-500">
                        Top Apps
                      </Text>
                      {summary.topApps.slice(0, 3).map((app, index) => (
                        <View key={index} className="flex-row justify-between py-1">
                          <Text variant="bodyMedium" className="mr-3 flex-1 text-slate-700" numberOfLines={1}>
                            {app.appName || app.packageName}
                          </Text>
                          <Text variant="bodyMedium" className="font-medium text-slate-500">
                            {formatDuration(app.durationMin)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Surface>
              </Pressable>
            );
          })}

          <Pressable
            className="mb-6 flex-row items-center justify-center gap-2 py-4"
            onPress={() => navigation.navigate('AddChild')}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text variant="bodyLarge" className="font-medium" style={{ color: colors.primary }}>
              Add Another Child
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
