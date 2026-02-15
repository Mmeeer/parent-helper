import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <Text style={styles.header}>Reports for {childName}</Text>

      {/* Period Toggle */}
      <View style={styles.periodRow}>
        {(['week', 'month'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodActive]}
            onPress={() => { setPeriod(p); setLoading(true); }}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.primary + '15' }]}>
            <Ionicons name="time-outline" size={24} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{formatDuration(summary.totalScreenTimeMin)}</Text>
            <Text style={styles.summaryLabel}>Total Screen Time</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.danger + '15' }]}>
            <Ionicons name="shield-outline" size={24} color={COLORS.danger} />
            <Text style={styles.summaryValue}>{summary.totalBlocked}</Text>
            <Text style={styles.summaryLabel}>Blocked</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.secondary + '15' }]}>
            <Ionicons name="globe-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.summaryValue}>{summary.totalWebVisits}</Text>
            <Text style={styles.summaryLabel}>Web Visits</Text>
          </View>
        </View>
      )}

      {/* Daily Screen Time Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Screen Time</Text>
        <View style={styles.chartContainer}>
          {breakdown.map((day, i) => (
            <View key={i} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max((day.screenTimeMin / maxScreenTime) * 100, 2)}%`,
                      backgroundColor: day.screenTimeMin > 180 ? COLORS.danger : COLORS.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>
                {period === 'week' ? formatDate(day.date) : formatShortDate(day.date)}
              </Text>
              <Text style={styles.barValue}>
                {day.screenTimeMin > 0 ? formatDuration(day.screenTimeMin) : '-'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Daily Blocked Items */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Blocked Attempts</Text>
        {breakdown.filter((d) => d.blocked > 0).length === 0 ? (
          <Text style={styles.noDataText}>No blocked attempts in this period</Text>
        ) : (
          <View style={styles.blockedList}>
            {breakdown.filter((d) => d.blocked > 0).map((day, i) => (
              <View key={i} style={styles.blockedRow}>
                <Text style={styles.blockedDate}>{day.date}</Text>
                <View style={styles.blockedBadge}>
                  <Text style={styles.blockedCount}>{day.blocked}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Top Apps */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Top Apps</Text>
        {topApps.length === 0 ? (
          <Text style={styles.noDataText}>No app usage data</Text>
        ) : (
          topApps.map((app, i) => {
            const maxTime = topApps[0]?.durationMin || 1;
            const pct = (app.durationMin / maxTime) * 100;
            return (
              <View key={i} style={styles.appRow}>
                <View style={styles.appRank}>
                  <Text style={styles.appRankText}>{i + 1}</Text>
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName} numberOfLines={1}>
                    {app.appName || app.packageName}
                  </Text>
                  <View style={styles.appBarBg}>
                    <View style={[styles.appBarFill, { width: `${pct}%` }]} />
                  </View>
                </View>
                <Text style={styles.appTime}>{formatDuration(app.durationMin)}</Text>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginHorizontal: 16, marginTop: 20, marginBottom: 16 },
  periodRow: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: COLORS.white,
    borderRadius: 12, padding: 4, marginBottom: 16,
  },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  periodActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  periodTextActive: { color: COLORS.white },
  summaryRow: { flexDirection: 'row', marginHorizontal: 12, gap: 8, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6,
    marginHorizontal: 4,
  },
  summaryValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  chartCard: {
    backgroundColor: COLORS.white, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barColumn: { flex: 1, alignItems: 'center' },
  barWrapper: { height: 120, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '60%', borderRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 6 },
  barValue: { fontSize: 9, color: COLORS.textLight, marginTop: 2 },
  blockedList: { gap: 8 },
  blockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  blockedDate: { fontSize: 14, color: COLORS.text },
  blockedBadge: { backgroundColor: COLORS.danger + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  blockedCount: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  noDataText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', paddingVertical: 20 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  appRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  appRankText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  appInfo: { flex: 1, gap: 4 },
  appName: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  appBarBg: { height: 6, backgroundColor: COLORS.background, borderRadius: 3 },
  appBarFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  appTime: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, minWidth: 50, textAlign: 'right' },
});
