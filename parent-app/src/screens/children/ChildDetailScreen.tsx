import React, { useCallback, useState, useEffect } from 'react';
import {
  View, ScrollView, RefreshControl, Pressable, Alert,
  Text, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatDuration, formatTime } from '../../utils/formatters';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import { C, CARD, LABEL } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ActivitySummary, AppUsageEntry, WebEntry } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'ChildDetail'>;
  readonly route: RouteProp<RootStackParamList, 'ChildDetail'>;
};

const PERIODS = ['day', 'week', 'month'] as const;
const PERIOD_LABELS: Record<string, string> = { day: 'Өдөр', week: '7 хоног', month: 'Сар' };

const ACTION_ITEMS = [
  { key: 'rules',      label: 'Дүрэм',          icon: 'settings-outline' as const,        route: 'RulesOverview' as const },
  { key: 'screentime', label: 'Дэлгэцийн цаг',  icon: 'time-outline' as const,             route: 'ScreenTimeRules' as const },
  { key: 'location',   label: 'Байршил',         icon: 'location-outline' as const,         route: 'LocationMap' as const },
  { key: 'devices',    label: 'Төхөөрөмж',       icon: 'phone-portrait-outline' as const,   route: 'DevicesList' as const },
  { key: 'reports',    label: 'Тайлан',          icon: 'bar-chart-outline' as const,        route: 'Reports' as const },
  { key: 'geofences',  label: 'Геофенс',         icon: 'navigate-outline' as const,         route: 'Geofences' as const },
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
      // 404 expected when child has no activity yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId, period]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const devices = await api.getChildDevices(childId);
      await Promise.all(devices.map((d) => api.sendDeviceCommand(d.id, 'sync').catch(() => null)));
      setTimeout(() => loadData(), 2000);
    } catch (err) {
      showError(err, 'Төхөөрөмжүүдийг синхрончлоход алдаа гарлаа.');
      loadData();
    }
  }, [childId, loadData]);

  const handleBlockDomain = useCallback((domain: string) => {
    Alert.alert('Домайн хаах', `"${domain}"-г ${childName}-ийн төхөөрөмжид хаах уу?`, [
      { text: 'Цуцлах', style: 'cancel' },
      {
        text: 'Хаах',
        style: 'destructive',
        onPress: () => { void (async () => {
          try {
            const rules = await api.getRules(childId);
            const current = rules.webFilter?.customBlock || [];
            if (current.includes(domain)) {
              Alert.alert('Аль хэдийн хаагдсан', `${domain} аль хэдийн хаагдсан байна.`);
            } else {
              await api.updateWebFilter(childId, { customBlock: [...current, domain] });
              Alert.alert('Хаагдлаа', `${domain} хаагдлаа.`);
            }
          } catch {
            Alert.alert('Алдаа', 'Домайн хаах боломжгүй байна.');
          }
        })(); },
      },
    ]);
  }, [childId, childName]);

  const handleBlockApp = useCallback((packageName: string, appName: string) => {
    Alert.alert('Апп хаах', `"${appName}"-г ${childName}-ийн төхөөрөмжид хаах уу?`, [
      { text: 'Цуцлах', style: 'cancel' },
      {
        text: 'Хаах',
        style: 'destructive',
        onPress: () => { void (async () => {
          try {
            const rules = await api.getRules(childId);
            const current = rules.blockedApps || [];
            if (current.includes(packageName)) {
              Alert.alert('Аль хэдийн хаагдсан', `${appName} аль хэдийн хаагдсан байна.`);
            } else {
              await api.updateBlockedApps(childId, [...current, packageName]);
              Alert.alert('Хаагдлаа', `${appName} хаагдлаа.`);
            }
          } catch {
            Alert.alert('Алдаа', 'Апп хаах боломжгүй байна.');
          }
        })(); },
      },
    ]);
  }, [childId, childName]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { navigation.setOptions({ title: childName }); }, [navigation, childName]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  // Approximate progress against a 4-hour (240 min) soft cap for the bar
  const screenTimePct = summary ? Math.min(summary.totalScreenTimeMin / 240, 1) : 0;

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.ink900} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-7 pb-10">

        {/* Location card */}
        <Pressable
          className="mt-5"
          onPress={() => navigation.navigate('LocationMap', { childId, childName })}
        >
          {({ pressed }) => (
            <View style={{ ...CARD, overflow: 'hidden', marginBottom: 16, opacity: pressed ? 0.85 : 1 }}>
              <View className="items-center justify-center bg-ink-100" style={{ height: 112 }}>
                <Text style={LABEL}>Байршлын газрын зураг</Text>
              </View>
              <View className="p-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-semibold text-ink-800">Байршил харах</Text>
                  <Text className="text-xs text-ink-400 mt-0.5">Сүүлийн мэдэгдэж буй байршил</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={C.ink300} />
              </View>
            </View>
          )}
        </Pressable>

        {/* Period selector */}
        <View className="flex-row mt-5 mb-6 gap-1 bg-white border rounded-[14px] p-1" style={{ borderColor: C.border }}>
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              className="flex-1 items-center py-2.5 rounded-[10px]"
              style={{ backgroundColor: period === p ? C.ink900 : 'transparent' }}
              onPress={() => { setPeriod(p); setLoading(true); }}
            >
              <Text className="text-xs font-semibold" style={{ color: period === p ? '#fff' : C.ink400 }}>
                {PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Screen time summary card */}
        {summary ? (
          <View style={{ ...CARD, padding: 20, marginBottom: 16 }}>
            <Text style={[LABEL, { marginBottom: 12 }]}>Дэлгэцийн цаг</Text>

            <View className="flex-row items-end gap-1.5 mb-3">
              <Text className="font-serif text-[36px] text-ink-900" style={{ lineHeight: 40 }}>
                {formatDuration(summary.totalScreenTimeMin)}
              </Text>
              <Text className="text-[13px] text-ink-400 mb-1">өнөөдөр</Text>
            </View>

            <View className="bg-ink-100 rounded h-1.5 overflow-hidden mb-4">
              <View style={{ backgroundColor: screenTimePct > 0.85 ? C.red : C.teal, height: '100%', width: `${screenTimePct * 100}%`, borderRadius: 4 }} />
            </View>

            <View className="flex-row border-t pt-4" style={{ borderTopColor: C.border }}>
              {[
                { value: String(summary.totalBlocked), label: 'Хаагдсан' },
                { value: String(summary.totalWebVisits), label: 'Вэб зочилсон' },
                { value: String(summary.topApps.length), label: 'Апп' },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <View className="w-px" style={{ backgroundColor: C.border }} />}
                  <View className="flex-1 items-center">
                    <Text className="font-serif text-ink-900" style={{ fontSize: 22, lineHeight: 26 }}>{stat.value}</Text>
                    <Text style={[LABEL, { marginTop: 4 }]}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ ...CARD, padding: 20, alignItems: 'center', marginBottom: 16 }}>
            <Text className="text-[13px] text-ink-400">Энэ хугацаанд мэдээлэл байхгүй</Text>
          </View>
        )}

        {/* Quick actions */}
        <Text style={[LABEL, { marginBottom: 12, marginTop: 8 }]}>Удирдах</Text>
        <View className="flex-row flex-wrap gap-3 mb-2">
          {ACTION_ITEMS.map((action) => (
            <Pressable
              key={action.key}
              style={{ width: '47%' }}
              onPress={() => navigation.navigate(action.route as any, { childId, childName })}
            >
              {({ pressed }) => (
                <View style={{ ...CARD, padding: 20, alignItems: 'center', gap: 8, opacity: pressed ? 0.8 : 1 }}>
                  <Ionicons name={action.icon} size={22} color={C.ink700} />
                  <Text className="text-[13px] font-semibold text-ink-700">{action.label}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* App usage */}
        <Text style={[LABEL, { marginBottom: 12, marginTop: 16 }]}>Апп хэрэглээ</Text>
        {apps.length === 0 ? (
          <View style={{ ...CARD, padding: 20, alignItems: 'center' }}>
            <Text className="text-[13px] text-ink-400">Өнөөдөр апп хэрэглээний мэдээлэл байхгүй</Text>
          </View>
        ) : (
          <View style={{ ...CARD, overflow: 'hidden' }}>
            {apps.map((app, index) => (
              <View
                key={`${app.packageName}-${index}`}
                className="flex-row items-center gap-3 px-5"
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: index < apps.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <View className="items-center justify-center bg-ink-100" style={{ width: 36, height: 36, borderRadius: 10 }}>
                  <Ionicons name="apps" size={17} color={C.ink600} />
                </View>
                <Text className="flex-1 text-[13px] text-ink-700" numberOfLines={1}>
                  {app.appName || app.packageName}
                </Text>
                <Text className="text-[13px] font-semibold text-ink-500">
                  {formatDuration(app.durationMin)}
                </Text>
                <TouchableOpacity onPress={() => handleBlockApp(app.packageName, app.appName || app.packageName)} className="p-1">
                  <Ionicons name="ban-outline" size={15} color={C.ink300} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Web activity */}
        <Text style={[LABEL, { marginBottom: 12, marginTop: 24 }]}>Вэб үйл ажиллагаа</Text>
        {webHistory.length === 0 ? (
          <View style={{ ...CARD, padding: 20, alignItems: 'center' }}>
            <Text className="text-[13px] text-ink-400">Өнөөдөр вэб үйл ажиллагаа бүртгэгдээгүй</Text>
          </View>
        ) : (
          <View style={{ ...CARD, overflow: 'hidden' }}>
            {webHistory.slice(0, 20).map((entry, index) => (
              <Pressable
                key={`${entry.url}-${index}`}
                className="flex-row items-center gap-3 px-5"
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: index < Math.min(webHistory.length, 20) - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
                onPress={() => { if (!entry.blocked) handleBlockDomain(entry.url); }}
                onLongPress={() => handleBlockDomain(entry.url)}
              >
                <View style={{
                  width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                  backgroundColor: entry.blocked ? C.red : C.teal,
                }} />
                <View className="flex-1">
                  <Text className="text-[13px]" style={{ color: entry.blocked ? C.red : C.ink700 }} numberOfLines={1}>
                    {entry.url}
                  </Text>
                  <Text className="text-[11px] text-ink-400 mt-0.5">
                    {formatTime(entry.timestamp)}
                  </Text>
                </View>
                {entry.blocked ? (
                  <View className="px-2 rounded-lg" style={{ backgroundColor: '#fff1f2', paddingVertical: 3 }}>
                    <Text className="text-[10px] font-semibold" style={{ color: C.red }}>Хаагдсан</Text>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => handleBlockDomain(entry.url)} className="p-1">
                    <Ionicons name="close-circle-outline" size={16} color={C.ink300} />
                  </TouchableOpacity>
                )}
              </Pressable>
            ))}
            {webHistory.length > 20 && (
              <View className="items-center py-3 border-t" style={{ borderTopColor: C.border }}>
                <Text className="text-xs text-ink-400">+{webHistory.length - 20} more</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
