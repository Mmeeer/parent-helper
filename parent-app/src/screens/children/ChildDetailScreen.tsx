import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { formatDuration, formatTimeAgo } from '../../utils/formatters';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ActivitySummary, AppUsageEntry, DeviceStatus } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChildDetail'>;
  route: RouteProp<RootStackParamList, 'ChildDetail'>;
};

export default function ChildDetailScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [apps, setApps] = useState<AppUsageEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [summaryData, appsData] = await Promise.all([
        api.getActivitySummary(childId, period),
        api.getAppUsage(childId),
      ]);
      setSummary(summaryData);
      setApps(appsData);
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

  useEffect(() => {
    navigation.setOptions({ title: childName });
  }, [navigation, childName]);

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
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(['day', 'week', 'month'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodActive]}
            onPress={() => { setPeriod(p); setLoading(true); }}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Stats */}
      {summary && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(summary.totalScreenTimeMin)}</Text>
            <Text style={styles.statLabel}>Screen Time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.totalBlocked}</Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{summary.totalWebVisits}</Text>
            <Text style={styles.statLabel}>Web Visits</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Manage</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('RulesOverview', { childId, childName })}
        >
          <Ionicons name="settings-outline" size={28} color={COLORS.primary} />
          <Text style={styles.actionLabel}>Rules</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('ScreenTimeRules', { childId, childName })}
        >
          <Ionicons name="time-outline" size={28} color={COLORS.warning} />
          <Text style={styles.actionLabel}>Screen Time</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('LocationMap', { childId, childName })}
        >
          <Ionicons name="location-outline" size={28} color={COLORS.danger} />
          <Text style={styles.actionLabel}>Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('DevicesList', { childId, childName })}
        >
          <Ionicons name="phone-portrait-outline" size={28} color={COLORS.secondary} />
          <Text style={styles.actionLabel}>Devices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Reports', { childId, childName })}
        >
          <Ionicons name="bar-chart-outline" size={28} color={COLORS.primary} />
          <Text style={styles.actionLabel}>Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Geofences', { childId, childName })}
        >
          <Ionicons name="navigate-outline" size={28} color={COLORS.info} />
          <Text style={styles.actionLabel}>Geofences</Text>
        </TouchableOpacity>
      </View>

      {/* App Usage List */}
      <Text style={styles.sectionTitle}>Today's App Usage</Text>
      {apps.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No app usage data for today</Text>
        </View>
      ) : (
        <View style={styles.appsCard}>
          {apps.map((app, index) => (
            <View
              key={index}
              style={[styles.appRow, index < apps.length - 1 && styles.appRowBorder]}
            >
              <View style={styles.appIcon}>
                <Ionicons name="apps" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.appName} numberOfLines={1}>
                {app.appName || app.packageName}
              </Text>
              <Text style={styles.appDuration}>{formatDuration(app.durationMin)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
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
  periodRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: COLORS.white,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    gap: 8,
  },
  actionCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  appsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  appRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  appDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});
