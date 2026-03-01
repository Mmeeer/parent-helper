import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Unread Alerts Banner */}
      {alerts.length > 0 && (
        <TouchableOpacity style={styles.alertBanner}>
          <Ionicons name="notifications" size={20} color={COLORS.warning} />
          <Text style={styles.alertBannerText}>
            {alerts.length} unread alert{alerts.length > 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Children Cards */}
      {children.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Children Added</Text>
          <Text style={styles.emptySubtitle}>
            Add a child profile to start monitoring.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddChild')}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Child</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          {children.map((child) => {
            const summary = summaries[child._id];
            const childBreakdown = breakdowns[child._id] || [];
            return (
              <TouchableOpacity
                key={child._id}
                style={styles.childCard}
                onPress={() =>
                  navigation.navigate('ChildDetail', {
                    childId: child._id,
                    childName: child.name,
                  })
                }
              >
                <View style={styles.childHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {child.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.childAge}>Age {child.age}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </View>

                {summary ? (
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.statValue}>
                        {formatDuration(summary.totalScreenTimeMin)}
                      </Text>
                      <Text style={styles.statLabel}>Screen Time</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Ionicons name="apps-outline" size={18} color={COLORS.secondary} />
                      <Text style={styles.statValue}>{summary.topApps.length}</Text>
                      <Text style={styles.statLabel}>Apps Used</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Ionicons name="shield-outline" size={18} color={COLORS.danger} />
                      <Text style={styles.statValue}>{summary.totalBlocked}</Text>
                      <Text style={styles.statLabel}>Blocked</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noData}>No activity data yet</Text>
                )}

                {/* Weekly Screen Time Mini Chart */}
                {childBreakdown.length > 0 && (
                  <View style={styles.miniChart}>
                    <Text style={styles.miniChartTitle}>This Week</Text>
                    <View style={styles.miniChartBars}>
                      {childBreakdown.map((day, i) => {
                        const maxMin = Math.max(...childBreakdown.map((d) => d.screenTimeMin), 1);
                        const pct = Math.max((day.screenTimeMin / maxMin) * 100, 3);
                        const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(day.date + 'T00:00:00').getDay()];
                        return (
                          <View key={i} style={styles.miniBarCol}>
                            <View style={styles.miniBarTrack}>
                              <View
                                style={[
                                  styles.miniBar,
                                  {
                                    height: `${pct}%`,
                                    backgroundColor: day.screenTimeMin > 180 ? COLORS.warning : COLORS.primary,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.miniBarLabel}>{dayLabel}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Top Apps */}
                {summary && summary.topApps.length > 0 && (
                  <View style={styles.topApps}>
                    <Text style={styles.topAppsTitle}>Top Apps</Text>
                    {summary.topApps.slice(0, 3).map((app, index) => (
                      <View key={index} style={styles.appRow}>
                        <Text style={styles.appName} numberOfLines={1}>
                          {app.appName || app.packageName}
                        </Text>
                        <Text style={styles.appDuration}>
                          {formatDuration(app.durationMin)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addChildButton}
            onPress={() => navigation.navigate('AddChild')}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addChildText}>Add Another Child</Text>
          </TouchableOpacity>
        </>
      )}
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    gap: 8,
  },
  alertBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  childCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  childInfo: {
    flex: 1,
    marginLeft: 12,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  childAge: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  noData: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textLight,
    paddingVertical: 12,
  },
  topApps: {
    marginTop: 12,
  },
  topAppsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  appName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginRight: 12,
  },
  appDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 24,
    gap: 8,
  },
  addChildText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
  },
  miniChart: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  miniChartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  miniChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  miniBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  miniBarTrack: {
    height: 48,
    width: '70%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  miniBar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 2,
  },
  miniBarLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
  },
});
