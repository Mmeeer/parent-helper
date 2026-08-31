import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DAYS_OF_WEEK, DAY_NAME_TO_NUM, DAY_NUM_TO_NAME } from '../../utils/constants';
import { formatDuration } from '../../utils/formatters';
import { isIosChild } from '../../utils/platform';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, Schedule, PerAppLimit, IosLimitMeta } from '../../types';
import type { InstalledApp } from '../../services/api';
import { C } from '../../theme';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'ScreenTimeRules'>;
};

// Minute presets for iOS per-app limit rules (created on the child's iPhone).
const IOS_LIMIT_PRESETS = [15, 30, 45, 60, 90, 120, 180];

export default function ScreenTimeRulesScreen({ route }: Props) {
  const { childId } = route.params;
  const { t } = useTranslation();
  // Daily limit is shown in HOURS (more natural for a daily cap) but the
  // backend stores it as `dailyLimitMin` so we convert at the API boundary.
  // Strings allow partial input like "2." while typing.
  const [dailyLimitHours, setDailyLimitHours] = useState('2');
  const [perAppLimits, setPerAppLimits] = useState<PerAppLimit[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  // Per-app limits rely on the Android package-name app list; hidden for iPhone children.
  const [iosChild, setIosChild] = useState(false);
  // iOS: per-app limit rules created on the child's iPhone — editable (minutes + on/off) here.
  const [iosLimits, setIosLimits] = useState<IosLimitMeta[]>([]);

  // Per-app form
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [newAppLimit, setNewAppLimit] = useState('30');

  useFocusEffect(
    useCallback(() => {
      loadRules();
    }, [childId]),
  );

  // Re-fetch when rules change via socket (e.g. another device or admin updates them)
  useEffect(() => {
    return onSocketEvent('rules:updated', () => { loadRules(); });
  }, [childId]);

  const loadRules = async () => {
    try {
      const rules = await api.getRules(childId);
      setIosLimits(rules.iosLimits ?? []);
      if (rules.screenTime) {
        const mins = rules.screenTime.dailyLimitMin ?? 120;
        // Show as hours, drop trailing zeros (2.0 → "2", 2.5 → "2.5")
        setDailyLimitHours(String(Number.parseFloat((mins / 60).toFixed(2))));
        setPerAppLimits(rules.screenTime.perApp ?? []);
        // Backend stores days as ints 0-6; UI works with day name strings.
        setSchedules(
          (rules.screenTime.schedule ?? []).map((s: any) => ({
            ...s,
            days: (s.days ?? []).map((d: any) =>
              typeof d === 'number' ? DAY_NUM_TO_NAME[d] : d,
            ).filter(Boolean),
          })),
        );
      }

      const devices = await api.getChildDevices(childId);
      const ios = isIosChild(devices);
      setIosChild(ios);
      if (ios) {
        // No package-name app list on iOS; per-app limits section is hidden.
        setInstalledApps([]);
        return;
      }
      let allApps: InstalledApp[] = [];
      for (const device of devices) {
        try {
          const apps = await api.getInstalledApps(device.id);
          allApps = [...allApps, ...apps];
        } catch { /* device may not have synced */ }
      }
      setInstalledApps(Array.from(new Map(allApps.map(a => [a.packageName, a])).values()));
    } catch {
      // No rules set yet — use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const hours = Number.parseFloat(dailyLimitHours.replace(',', '.'));
    if (Number.isNaN(hours) || hours <= 0 || hours > 24) {
      Alert.alert(t('common.error'), t('screenTimeRules.dailyLimitError'));
      return;
    }
    // Backend expects minutes; round to the nearest minute.
    const limitMin = Math.round(hours * 60);

    setSaving(true);
    try {
      // Convert day names back to ints 0-6 for the backend / child app.
      const scheduleForApi = schedules.map((s) => ({
        ...s,
        days: s.days.map((d) => DAY_NAME_TO_NUM[d]).filter((n) => n !== undefined),
      }));
      await api.updateScreenTime(childId, {
        dailyLimitMin: limitMin,
        perApp: perAppLimits,
        schedule: scheduleForApi as any,
        ...(iosChild
          ? { iosLimits: iosLimits.map((l) => ({ id: l.id, limitMin: l.limitMin, enabled: l.enabled })) }
          : {}),
      });
      Alert.alert(t('screenTimeRules.saved'), t('screenTimeRules.savedDesc'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('screenTimeRules.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const availableApps = useMemo(() => {
    const existingPkgs = new Set(perAppLimits.map(a => a.appId));
    const filtered = installedApps.filter(a => !existingPkgs.has(a.packageName));
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(a => a.appName.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q));
  }, [installedApps, perAppLimits, searchQuery]);

  const pickAppForLimit = (app: InstalledApp) => {
    setSelectedApp(app);
    setPickerVisible(false);
    setSearchQuery('');
  };

  const addPerAppLimit = () => {
    if (!selectedApp) {
      Alert.alert(t('common.error'), t('screenTimeRules.selectAppFirst'));
      return;
    }
    const limit = Number.parseInt(newAppLimit, 10);
    if (Number.isNaN(limit) || limit <= 0) {
      Alert.alert(t('common.error'), t('screenTimeRules.timeLimitError'));
      return;
    }
    if (perAppLimits.some((a) => a.appId === selectedApp.packageName)) {
      Alert.alert(t('screenTimeRules.duplicate'), t('screenTimeRules.duplicateDesc'));
      return;
    }
    setPerAppLimits([...perAppLimits, { appId: selectedApp.packageName, appName: selectedApp.appName, limitMin: limit }]);
    setSelectedApp(null);
    setNewAppLimit('30');
  };

  const removePerAppLimit = (index: number) => {
    setPerAppLimits(perAppLimits.filter((_, i) => i !== index));
  };

  const setIosLimitMin = (id: string, limitMin: number) => {
    setIosLimits(prev => prev.map(l => (l.id === id ? { ...l, limitMin } : l)));
  };

  const toggleIosLimit = (id: string, enabled: boolean) => {
    setIosLimits(prev => prev.map(l => (l.id === id ? { ...l, enabled } : l)));
  };

  const addSchedule = () => {
    setSchedules([
      ...schedules,
      {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '08:00',
        endTime: '15:00',
        blocked: true,
      },
    ]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const toggleDay = (scheduleIndex: number, day: string) => {
    const updated = [...schedules];
    const schedule = { ...updated[scheduleIndex] };
    if (schedule.days.includes(day)) {
      schedule.days = schedule.days.filter((d) => d !== day);
    } else {
      schedule.days = [...schedule.days, day];
    }
    updated[scheduleIndex] = schedule;
    setSchedules(updated);
  };

  const updateScheduleTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  // For helper text + preset highlighting (in minutes).
  const parsedLimit = Math.round(
    (Number.parseFloat(dailyLimitHours.replace(',', '.')) || 0) * 60,
  );

  return (
    <>
    <ScrollView className="flex-1 bg-surface">
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-1.5">{t('screenTimeRules.control')}</Text>
        <Text className="font-display text-[32px] font-bold text-gray-900 leading-9">
          {t('screenTimeRules.screenTime')}
        </Text>
      </View>

      {/* Daily Limit */}
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-3">{t('screenTimeRules.dailyLimit')}</Text>
        <Text className="text-sm font-display font-bold text-gray-900 mb-3">
          {t('screenTimeRules.dailyScreenTimeLimit')}
        </Text>
        <View className="flex-row items-center gap-2">
          <TextInput
            className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900 w-24 text-center"
            value={dailyLimitHours}
            onChangeText={(v) => {
              // Only digits + a single decimal separator. Strip everything
              // else so a stray "h" or "min" never produces NaN at save.
              const cleaned = v.replace(/[^0-9.,]/g, '').replaceAll(',', '.');
              const dots = cleaned.split('.');
              setDailyLimitHours(dots.length > 1 ? `${dots[0]}.${dots.slice(1).join('')}` : cleaned);
            }}
            keyboardType="decimal-pad"
            maxLength={5}
            placeholder="2"
            placeholderTextColor={C.gray300}
          />
          <Text className="text-sm text-gray-500">{t('common.hours')}</Text>
          <Text className="text-xs text-gray-400 font-medium">
            ({formatDuration(parsedLimit)})
          </Text>
        </View>

        {/* Quick presets — values stored in hours (allows half-hour) */}
        <View className="flex-row mt-3 gap-2 flex-wrap">
          {[0.5, 1, 2, 3, 4].map((hrs) => {
            const mins = Math.round(hrs * 60);
            return (
              <TouchableOpacity
                key={hrs}
                onPress={() => setDailyLimitHours(String(hrs))}
                className={`px-3 py-1.5 rounded-full ${parsedLimit === mins ? 'bg-nest-500' : 'bg-gray-100'}`}
              >
                <Text
                  className={`text-xs font-medium ${parsedLimit === mins ? 'text-white' : 'text-gray-500'}`}
                >
                  {formatDuration(mins)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Per-App Limits — iOS edits the limit rules created on the child's iPhone */}
      {iosChild ? (
        <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
          <Text className="text-xs text-gray-400 font-bold uppercase mb-3">{t('screenTimeRules.appLimit')}</Text>
          <Text className="text-sm font-display font-bold text-gray-900 mb-1">{t('screenTime.iosLimitsTitle')}</Text>
          {iosLimits.length === 0 ? (
            <Text className="text-xs text-gray-400 leading-4 mt-1">{t('screenTime.noIosLimits')}</Text>
          ) : (
            iosLimits.map((limit) => (
              <View key={limit.id} className="py-3 border-b border-gray-100">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                      {limit.name}
                    </Text>
                    <Text className="text-[11px] text-gray-400 mt-0.5">
                      {t('screenTime.limitCounts', { apps: limit.appCount, categories: limit.categoryCount })}
                    </Text>
                  </View>
                  <Switch
                    value={limit.enabled}
                    onValueChange={(v) => toggleIosLimit(limit.id, v)}
                    trackColor={{ true: C.safe500, false: C.gray200 }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {/* Minute presets (same chip pattern as the daily limit) */}
                <View className="flex-row mt-2 gap-2 flex-wrap" style={{ opacity: limit.enabled ? 1 : 0.4 }}>
                  {IOS_LIMIT_PRESETS.map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => setIosLimitMin(limit.id, mins)}
                      disabled={!limit.enabled}
                      className={`px-3 py-1.5 rounded-full ${limit.limitMin === mins ? 'bg-nest-500' : 'bg-gray-100'}`}
                    >
                      <Text
                        className={`text-xs font-medium ${limit.limitMin === mins ? 'text-white' : 'text-gray-500'}`}
                      >
                        {formatDuration(mins)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-3">{t('screenTimeRules.appLimit')}</Text>
        <Text className="text-sm font-display font-bold text-gray-900 mb-1">{t('screenTimeRules.appLimitTitle')}</Text>
        <Text className="text-xs text-gray-400 mb-4">
          {t('screenTimeRules.appLimitDesc')}
        </Text>

        {/* Add per-app form */}
        <View className="gap-2 mb-3">
          <Pressable
            className="flex-row items-center rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 gap-2"
            onPress={() => setPickerVisible(true)}
          >
            <Ionicons name="cube-outline" size={20} color={selectedApp ? C.gray900 : C.gray400} />
            <Text
              className={`flex-1 text-sm ${selectedApp ? 'text-gray-900' : 'text-gray-300'}`}
            >
              {selectedApp ? selectedApp.appName : t('screenTimeRules.selectApp')}
            </Text>
            <Ionicons name="chevron-down" size={18} color={C.gray400} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900"
              value={newAppLimit}
              onChangeText={setNewAppLimit}
              placeholder="30"
              keyboardType="number-pad"
              maxLength={4}
              placeholderTextColor={C.gray300}
            />
            <Text className="text-sm text-gray-500">{t('screenTimeRules.minPerDay')}</Text>
            <TouchableOpacity
              className="w-10 h-10 rounded-2xl bg-nest-500 items-center justify-center"
              onPress={addPerAppLimit}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Per-app list */}
        {perAppLimits.length === 0 ? (
          <Text className="text-xs text-gray-400 text-center py-4">
            {t('screenTimeRules.noAppLimits')}
          </Text>
        ) : (
          perAppLimits.map((app, index) => (
            <View
              key={app.appId}
              className="flex-row items-center py-2.5 gap-2.5 border-b border-gray-200"
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                  {app.appName || app.appId}
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5 font-mono" numberOfLines={1}>
                  {app.appId}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-gray-900">
                {formatDuration(app.limitMin)}
              </Text>
              <TouchableOpacity onPress={() => removePerAppLimit(index)} className="p-1">
                <Ionicons name="close-circle-outline" size={20} color={C.gray400} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
      )}

      {/* Schedules */}
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-xs text-gray-400 font-bold uppercase">{t('screenTimeRules.blockedSchedule')}</Text>
          <TouchableOpacity onPress={addSchedule} className="p-1">
            <Ionicons name="add-circle" size={26} color={C.nest500} />
          </TouchableOpacity>
        </View>
        <Text className="text-sm font-display font-bold text-gray-900 mb-1">{t('screenTimeRules.blockedScheduleTitle')}</Text>
        <Text className="text-xs text-gray-400 mb-3">
          {t('screenTimeRules.blockedScheduleDesc')}
        </Text>

        {schedules.map((schedule, index) => (
          <View
            key={index}
            className="rounded-2xl p-3.5 mt-2.5 bg-gray-100"
          >
            <View className="flex-row justify-between items-center mb-2.5">
              <Text className="text-sm font-display font-bold text-gray-900">
                {t('screenTimeRules.scheduleNum', { num: index + 1 })}
              </Text>
              <TouchableOpacity onPress={() => removeSchedule(index)} className="p-1">
                <Ionicons name="trash-outline" size={20} color={C.danger500} />
              </TouchableOpacity>
            </View>

            {/* Days */}
            <View className="flex-row flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(index, day)}
                  className={`px-3 py-1.5 rounded-full ${schedule.days.includes(day) ? 'bg-nest-500' : 'bg-white border border-gray-200'}`}
                >
                  <Text
                    className={`text-xs font-medium ${schedule.days.includes(day) ? 'text-white' : 'text-gray-400'}`}
                  >
                    {t(`days.${day.slice(0, 3).toLowerCase()}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Range */}
            <View className="flex-row items-end mt-3 gap-2">
              <View className="flex-1">
                <Text className="text-[11px] text-gray-400 mb-1">{t('screenTimeRules.start')}</Text>
                <TextInput
                  className="rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center"
                  value={schedule.startTime}
                  onChangeText={(v) => updateScheduleTime(index, 'startTime', v)}
                  placeholder="08:00"
                  placeholderTextColor={C.gray300}
                />
              </View>
              <Text className="text-sm text-gray-400 pb-2">—</Text>
              <View className="flex-1">
                <Text className="text-[11px] text-gray-400 mb-1">{t('screenTimeRules.end')}</Text>
                <TextInput
                  className="rounded-2xl bg-white border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center"
                  value={schedule.endTime}
                  onChangeText={(v) => updateScheduleTime(index, 'endTime', v)}
                  placeholder="15:00"
                  placeholderTextColor={C.gray300}
                />
              </View>
            </View>
          </View>
        ))}

        {schedules.length === 0 && (
          <Text className="text-xs text-gray-400 text-center py-4">
            {t('screenTimeRules.noSchedules')}
          </Text>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className={`bg-nest-500 rounded-2xl items-center justify-center mx-4 mt-2 h-[52px] ${saving ? 'opacity-60' : 'opacity-100'}`}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-sm font-display font-bold text-white tracking-tight">
            {t('screenTimeRules.saveChanges')}
          </Text>
        )}
      </TouchableOpacity>

      <View className="h-10" />
    </ScrollView>

    {/* App Picker Modal */}
    <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-surface">
        <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
          <Text className="font-display text-[24px] font-bold text-gray-900">{t('screenTimeRules.selectAppTitle')}</Text>
          <TouchableOpacity
            onPress={() => { setPickerVisible(false); setSearchQuery(''); }}
            className="p-1"
          >
            <Ionicons name="close" size={24} color={C.gray900} />
          </TouchableOpacity>
        </View>
        <View
          className="flex-row items-center mx-4 rounded-2xl bg-gray-50 border border-gray-200 px-4 mb-2 gap-2"
        >
          <Ionicons name="search" size={20} color={C.gray400} />
          <TextInput
            className="flex-1 h-12 text-sm text-gray-900"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('screenTimeRules.searchApp')}
            placeholderTextColor={C.gray300}
            autoFocus
          />
        </View>
        <FlatList
          data={availableApps}
          keyExtractor={item => item.packageName}
          renderItem={({ item }) => (
            <Pressable
              className="bg-white rounded-3xl mx-4 mb-1 flex-row items-center py-3 px-4 gap-3 border border-gray-100"
              onPress={() => pickAppForLimit(item)}
            >
              {item.iconBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${item.iconBase64}` }}
                  style={{ width: 40, height: 40, borderRadius: 12 }}
                />
              ) : (
                <View className="w-10 h-10 rounded-xl bg-nest-50 justify-center items-center">
                  <Ionicons name="cube-outline" size={22} color={C.nest500} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900">
                  {item.appName}
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  {item.packageName}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-xs text-gray-400 text-center py-4">
              {installedApps.length === 0 ? t('screenTimeRules.noAppsSynced') : t('screenTimeRules.noMatchingApps')}
            </Text>
          }
        />
      </View>
    </Modal>
    </>
  );
}
