import React, { useCallback, useState, useEffect } from 'react';
import {
  View, ScrollView, RefreshControl, Pressable, Alert,
  Text, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { formatDuration, formatTime } from '../../utils/formatters';
import { showError } from '../../utils/showError';
import { isIosChild } from '../../utils/platform';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import { useTranslation } from 'react-i18next';
import { C } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, ActivitySummary, AppUsageEntry, WebEntry, Rules } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'ChildDetail'>;
  readonly route: RouteProp<RootStackParamList, 'ChildDetail'>;
};

const PERIODS = ['day', 'week', 'month'] as const;

const APP_COLORS = [C.nest500, C.warm500, C.safe500, C.danger400, C.nest400, C.warm400];

export default function ChildDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();

  const PERIOD_LABELS: Record<string, string> = { day: t('childDetail.day'), week: t('childDetail.week'), month: t('childDetail.month') };

  const ACTION_ITEMS = [
    { key: 'rules',      label: t('childDetail.rules'),      icon: 'settings-outline' as const,        route: 'RulesOverview' as const,   color: C.nest500 },
    { key: 'screentime', label: t('childDetail.screenTime'),  icon: 'time-outline' as const,             route: 'ScreenTimeRules' as const, color: C.warm500 },
    { key: 'location',   label: t('childDetail.location'),    icon: 'location-outline' as const,         route: 'LocationMap' as const,     color: C.danger500 },
    { key: 'devices',    label: t('childDetail.devices'),     icon: 'phone-portrait-outline' as const,   route: 'DevicesList' as const,     color: C.nest400 },
    { key: 'reports',    label: t('childDetail.reports'),     icon: 'bar-chart-outline' as const,        route: 'Reports' as const,         color: C.safe500 },
    { key: 'geofences',  label: t('childDetail.geofences'),   icon: 'navigate-outline' as const,         route: 'Geofences' as const,       color: C.warm400 },
  ];
  const { childId, childName } = route.params;
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [rules, setRules] = useState<Rules | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [apps, setApps] = useState<AppUsageEntry[]>([]);
  const [webHistory, setWebHistory] = useState<WebEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  // NOSONAR: SonarLint S1854 false-positive on useState destructuring
  const [deviceCount, setDeviceCount] = useState(0);
  // iOS child: no browsing history (Safari content blocker only reports counts).
  const [iosChild, setIosChild] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Devices first — if none, the rest of the dashboard is meaningless.
      const deviceList = await api.getChildDevices(childId).catch(() => []);
      setDeviceCount(deviceList.length);
      setIosChild(isIosChild(deviceList));
      if (deviceList.length === 0) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const [summaryData, appsData, webData, rulesData] = await Promise.all([
        api.getActivitySummary(childId, period),
        api.getAppUsage(childId),
        api.getWebActivity(childId),
        api.getRules(childId).catch(() => null),
      ]);
      setSummary(summaryData);
      setApps(appsData);
      setWebHistory(webData);
      setRules(rulesData);
    } catch (err: any) {
      // 404 expected when child has no activity yet — only show real errors
      if (err?.status && err.status !== 404) {
        showError(err, t('childDetail.loadError'));
      }
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
      showError(err, t('childDetail.syncError'));
      loadData();
    }
  }, [childId, loadData]);

  const handleBlockDomain = useCallback((domain: string) => {
    Alert.alert(t('childDetail.blockDomain'), t('childDetail.blockDomainConfirm', { domain, childName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.block'),
        style: 'destructive',
        onPress: () => { void (async () => {
          try {
            const rules = await api.getRules(childId);
            const current = rules.webFilter?.customBlock || [];
            if (current.includes(domain)) {
              Alert.alert(t('childDetail.alreadyBlocked'), t('childDetail.alreadyBlockedDesc', { target: domain }));
            } else {
              await api.updateWebFilter(childId, { customBlock: [...current, domain] });
              Alert.alert(t('childDetail.domainBlocked'), t('childDetail.domainBlockedDesc', { target: domain }));
            }
          } catch {
            Alert.alert(t('common.error'), t('childDetail.domainBlockError'));
          }
        })(); },
      },
    ]);
  }, [childId, childName]);

  const handleBlockApp = useCallback((packageName: string, appName: string) => {
    Alert.alert(t('childDetail.blockApp'), t('childDetail.blockAppConfirm', { appName, childName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.block'),
        style: 'destructive',
        onPress: () => { void (async () => {
          try {
            const rules = await api.getRules(childId);
            const current = rules.blockedApps || [];
            if (current.includes(packageName)) {
              Alert.alert(t('childDetail.alreadyBlocked'), t('childDetail.alreadyBlockedDesc', { target: appName }));
            } else {
              await api.updateBlockedApps(childId, [...current, packageName]);
              Alert.alert(t('childDetail.domainBlocked'), t('childDetail.domainBlockedDesc', { target: appName }));
            }
          } catch {
            Alert.alert(t('common.error'), t('childDetail.appBlockError'));
          }
        })(); },
      },
    ]);
  }, [childId, childName]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  useEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  // Re-fetch when rules are updated via socket so the screen shows fresh data
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) return;
    return onSocketEvent('rules:updated', () => { loadData(); });
  }, [isFocused, loadData]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  const initial = childName.charAt(0).toUpperCase();

  // No device paired yet — show only the Connect Device flow. Everything else
  // (screen time, location, app usage) is meaningless until a device is paired.
  if (deviceCount === 0) {
    return (
      <ScrollView className="flex-1 bg-surface" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-10">
          {/* Header */}
          <View className="flex-row items-center mt-14 mb-5">
            <Pressable
              className="w-9 h-9 rounded-2xl bg-white border border-gray-200 items-center justify-center"
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={18} color={C.gray600} />
            </Pressable>
            <View className="w-11 h-11 rounded-2xl items-center justify-center ml-3 bg-nest-500">
              <Text className="text-white font-bold text-base">{initial}</Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-extrabold text-lg text-gray-900">{childName}</Text>
              <Text className="text-xs text-gray-400">{t('common.notConnected')}</Text>
            </View>
          </View>

          {/* Connect-device hero */}
          <View className="bg-white rounded-3xl p-8 mt-4 items-center border border-gray-100 shadow-sm">
            <View className="w-20 h-20 rounded-full bg-nest-50 items-center justify-center mb-5">
              <Ionicons name="phone-portrait-outline" size={40} color={C.nest500} />
            </View>
            <Text className="text-lg font-display font-extrabold text-gray-900 text-center mb-2">
              {t('childDetail.connectDeviceTitle')}
            </Text>
            <Text className="text-sm text-gray-500 text-center leading-5 mb-6">
              {t('childDetail.connectDeviceDesc', { childName })}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PairDevice', { childId, childName })}
              className="bg-nest-500 rounded-2xl items-center justify-center flex-row gap-x-2 shadow-lg h-[52px] w-full"
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text className="text-sm font-display font-bold text-white tracking-wide">
                {t('childDetail.connectDevice')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Progress against the child's real daily limit when one is set; otherwise a
  // 4-hour soft reference so the bar still means something. Week/month sums are
  // compared against the limit × days tracked.
  const dailyLimitMin = rules?.screenTime?.dailyLimitMin || 0;
  const periodDays = Math.max(1, summary?.daysTracked || 1);
  const screenTimeCapMin = (dailyLimitMin > 0 ? dailyLimitMin : 240) * (period === 'day' ? 1 : periodDays);
  const screenTimePct = summary ? Math.min(summary.totalScreenTimeMin / screenTimeCapMin, 1) : 0;

  return (
    <ScrollView
      className="flex-1 bg-surface"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.nest500} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pb-10">

        {/* ── Header row ── */}
        <View className="flex-row items-center mt-14 mb-5">
          {/* Back button */}
          <Pressable
            className="w-9 h-9 rounded-2xl bg-white border border-gray-200 items-center justify-center"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={18} color={C.gray600} />
          </Pressable>

          {/* Child avatar */}
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center ml-3 bg-nest-500"
          >
            <Text className="text-white font-bold text-base">{initial}</Text>
          </View>

          {/* Child name & info */}
          <View className="flex-1 ml-3">
            <Text className="font-extrabold text-lg text-gray-900">{childName}</Text>
            <Text className="text-xs text-gray-400">{t('common.online')}</Text>
          </View>

          {/* SOS button */}
          <View
            className="w-10 h-10 rounded-full items-center justify-center bg-danger-500 shadow-lg elevation-6"
            style={{ shadowColor: C.danger500 }}
          >
            <Ionicons name="warning" size={20} color="#fff" />
          </View>
        </View>

        {/* ── Map card ── */}
        <Pressable
          onPress={() => navigation.navigate('LocationMap', { childId, childName })}
        >
          {({ pressed }) => (
            <View
              className="bg-white rounded-3xl overflow-hidden mb-4 border border-gray-100 shadow-sm"
              style={{ opacity: pressed ? 0.85 : 1 }}
            >
              {/* Map placeholder gradient */}
              <View className="h-36 items-center justify-center bg-nest-50">
                <Ionicons name="location" size={32} color={C.nest400} />
              </View>
              <View className="p-4">
                <Text className="text-sm font-bold text-gray-800">
                  {'\uD83D\uDCCD'} {t('childDetail.viewLocation')}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">{t('childDetail.lastKnownLocation')}</Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* ── Period selector ── */}
        <View className="flex-row mb-5 gap-1 bg-white border border-gray-100 rounded-[14px] p-1">
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              className={`flex-1 items-center py-2.5 rounded-[10px] ${period === p ? 'bg-nest-500' : 'bg-transparent'}`}
              onPress={() => { setPeriod(p); setLoading(true); }}
            >
              <Text className={`text-xs font-semibold ${period === p ? 'text-white' : 'text-gray-400'}`}>
                {PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Screen time card ── */}
        {summary ? (
          <View
            className="bg-white rounded-3xl p-4 mb-4 border border-gray-100 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-bold text-gray-900 text-sm">{t('childDetail.screenTime')}</Text>
              <Text className="text-xs text-gray-400 font-semibold">
                {formatDuration(summary.totalScreenTimeMin)} {t('childDetail.screenTimeToday')}
              </Text>
            </View>

            {/* iPhone cannot report per-app usage — say what the number actually covers */}
            {iosChild && (
              <Text className="text-[11px] text-gray-400 leading-4 -mt-1.5 mb-3">
                {t('screenTime.iosManagedAppsCaption')}
              </Text>
            )}

            {/* Progress bar + what it's measured against */}
            <View className="flex-row justify-between mb-1">
              <Text className="text-[11px] text-gray-400 font-semibold">{Math.round(screenTimePct * 100)}%</Text>
              <Text className="text-[11px] text-gray-400">
                {dailyLimitMin > 0
                  ? t('childDetail.ofDailyLimit', { min: dailyLimitMin })
                  : t('childDetail.ofSoftCap')}
              </Text>
            </View>
            <View className="bg-gray-100 rounded-full h-3 overflow-hidden mb-4">
              <View
                className="h-3 rounded-full"
                style={{
                  backgroundColor: screenTimePct > 0.85 ? C.danger500 : C.nest500,
                  width: `${screenTimePct * 100}%`,
                }}
              />
            </View>

            {/* Stats row */}
            <View className="flex-row border-t border-gray-100 pt-4">
              {(iosChild
                ? [
                    { value: String(summary.totalBlocked), label: t('alerts.blocked') },
                    { value: String(summary.daysTracked), label: t('childDetail.daysTracked') },
                    { value: dailyLimitMin > 0 ? `${dailyLimitMin}` : '—', label: t('childDetail.dailyLimitShort') },
                  ]
                : [
                    { value: String(summary.totalBlocked), label: t('alerts.blocked') },
                    { value: String(summary.totalWebVisits), label: t('childDetail.webVisits') },
                    { value: String(summary.topApps.length), label: t('alerts.app') },
                  ]
              ).map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <View className="w-px bg-gray-100" />}
                  <View className="flex-1 items-center">
                    <Text className="font-extrabold text-gray-900 text-[22px] leading-[26px]">{stat.value}</Text>
                    <Text className="text-xs text-gray-400 font-semibold mt-1">{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : (
          <View
            className="bg-white rounded-3xl p-5 items-center mb-4 border border-gray-100 shadow-sm"
          >
            <Text className="text-xs text-gray-400">{t('childDetail.noDataPeriod')}</Text>
          </View>
        )}

        {/* ── App usage card ── */}
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-3 mt-2">{t('childDetail.appUsage')}</Text>
        {apps.length === 0 ? (
          <View
            className="bg-white rounded-3xl p-5 items-center border border-gray-100 shadow-sm"
          >
            <Text className="text-xs text-gray-400">{t('childDetail.noAppUsage')}</Text>
          </View>
        ) : (
          <View
            className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm"
          >
            {apps.map((app, index) => (
              <View
                key={`${app.packageName}-${index}`}
                className={`flex-row items-center gap-3 px-4 py-3 ${index < apps.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center"
                  style={{ backgroundColor: APP_COLORS[index % APP_COLORS.length] + '20' }}
                >
                  <Ionicons name="apps" size={15} color={APP_COLORS[index % APP_COLORS.length]} />
                </View>
                <Text className="flex-1 text-xs font-bold text-gray-800" numberOfLines={1}>
                  {app.appName || app.packageName}
                </Text>
                <Text className="text-xs font-semibold text-gray-500">
                  {formatDuration(app.durationMin)}
                </Text>
                <TouchableOpacity onPress={() => handleBlockApp(app.packageName, app.appName || app.packageName)} className="p-1">
                  <Ionicons name="ban-outline" size={15} color={C.gray400} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Website access card (Android only — iOS reports no per-URL history) ── */}
        {!iosChild && (
        <>
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-3 mt-6">{t('childDetail.webActivity')}</Text>
        {webHistory.length === 0 ? (
          <View
            className="bg-white rounded-3xl p-5 items-center border border-gray-100 shadow-sm"
          >
            <Text className="text-xs text-gray-400">{t('childDetail.noWebActivity')}</Text>
          </View>
        ) : (
          <View
            className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm"
          >
            {webHistory.slice(0, 20).map((entry, index) => (
              <Pressable
                key={`${entry.url}-${index}`}
                onPress={() => { if (!entry.blocked) handleBlockDomain(entry.url); }}
                onLongPress={() => handleBlockDomain(entry.url)}
              >
                <View
                  className={`flex-row items-center gap-3 px-4 py-2.5 ${index < Math.min(webHistory.length, 20) - 1 ? 'border-b border-gray-100' : ''} ${entry.blocked ? 'bg-danger-50' : 'bg-safe-50'}`}
                >
                  {/* Status dot */}
                  <View
                    className={`p-2 rounded-xl ${entry.blocked ? 'bg-danger-50' : 'bg-safe-50'}`}
                  >
                    <View
                      className={`w-2 h-2 rounded-full ${entry.blocked ? 'bg-danger-500' : 'bg-safe-500'}`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-700" numberOfLines={1}>
                      {entry.url}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">
                      {formatTime(entry.timestamp)}
                    </Text>
                  </View>
                  {entry.blocked ? (
                    <View className="px-2 py-1 rounded-lg bg-danger-100">
                      <Text className="text-[10px] font-semibold text-danger-600">{t('common.blocked')}</Text>
                    </View>
                  ) : (
                    <View className="px-2 py-1 rounded-lg bg-safe-100">
                      <Text className="text-[10px] font-semibold text-safe-600">{t('common.allowed')}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
            {webHistory.length > 20 && (
              <View className="items-center py-3 border-t border-gray-100">
                <Text className="text-xs text-gray-400">{t('childDetail.others', { count: webHistory.length - 20 })}</Text>
              </View>
            )}
          </View>
        )}
        </>
        )}

        {/* ── Device info grid ── */}
        {summary && (
          <>
            <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-3 mt-6">{t('childDetail.deviceInfo')}</Text>
            <View className="flex-row gap-2 mb-4">
              {[
                { value: String(summary.totalBlocked), label: t('alerts.blocked'), color: C.gray900 },
                { value: String(summary.totalWebVisits), label: t('alerts.web'), color: C.gray900 },
                { value: 'ON', label: t('childDetail.status'), color: C.safe600 },
              ].map((cell) => (
                <View key={cell.label} className="flex-1 bg-gray-50 rounded-2xl p-3 items-center">
                  <Text className={`text-lg font-extrabold ${cell.color === C.safe600 ? 'text-safe-600' : 'text-gray-900'}`}>{cell.value}</Text>
                  <Text className="text-[10px] text-gray-400 font-semibold mt-0.5">{cell.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Quick actions ── */}
        <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-3 mt-2">{t('childDetail.manage')}</Text>
        <View className="flex-row flex-wrap gap-3 mb-2">
          {ACTION_ITEMS.map((action) => (
            <Pressable
              key={action.key}
              className="w-[47%]"
              onPress={() => navigation.navigate(action.route as any, { childId, childName })}
            >
              {({ pressed }) => (
                <View
                  className="bg-white rounded-3xl p-5 items-center border border-gray-100 gap-2 shadow-sm"
                  style={{ opacity: pressed ? 0.8 : 1 }}
                >
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: action.color + '18' }}
                  >
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                  <Text className="text-xs font-bold text-gray-800">{action.label}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}
