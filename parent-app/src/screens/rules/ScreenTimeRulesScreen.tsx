import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  Surface,
  Text,
  TextInput,
  Button,
  Chip,
  IconButton,
  ActivityIndicator,
  TouchableRipple,
} from 'react-native-paper';
import { colors } from '../../theme';
import { DAYS_OF_WEEK } from '../../utils/constants';
import { formatDuration } from '../../utils/formatters';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, Schedule, PerAppLimit } from '../../types';
import type { InstalledApp } from '../../services/api';

type Props = {
  route: RouteProp<RootStackParamList, 'ScreenTimeRules'>;
};

export default function ScreenTimeRulesScreen({ route }: Props) {
  const { childId } = route.params;
  const [dailyLimit, setDailyLimit] = useState('120');
  const [perAppLimits, setPerAppLimits] = useState<PerAppLimit[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);

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

  const loadRules = async () => {
    try {
      const rules = await api.getRules(childId);
      if (rules.screenTime) {
        setDailyLimit(String(rules.screenTime.dailyLimitMin ?? 120));
        setPerAppLimits(rules.screenTime.perApp ?? []);
        setSchedules(rules.screenTime.schedule ?? []);
      }

      // Load installed apps for the app picker
      const devices = await api.getChildDevices(childId);
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
    const limitMin = parseInt(dailyLimit, 10);
    if (isNaN(limitMin) || limitMin < 0) {
      Alert.alert('Error', 'Please enter a valid daily limit in minutes.');
      return;
    }

    setSaving(true);
    try {
      await api.updateScreenTime(childId, {
        dailyLimitMin: limitMin,
        perApp: perAppLimits,
        schedule: schedules,
      });
      Alert.alert('Saved', 'Screen time rules updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update rules.');
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

  // ─── Per-App Limits ────────────────────────────────
  const addPerAppLimit = () => {
    if (!selectedApp) {
      Alert.alert('Error', 'Please choose an app first.');
      return;
    }
    const limit = parseInt(newAppLimit, 10);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('Error', 'Please enter a valid time limit.');
      return;
    }
    if (perAppLimits.some((a) => a.appId === selectedApp.packageName)) {
      Alert.alert('Duplicate', 'This app already has a limit set.');
      return;
    }
    setPerAppLimits([...perAppLimits, { appId: selectedApp.packageName, appName: selectedApp.appName, limitMin: limit }]);
    setSelectedApp(null);
    setNewAppLimit('30');
  };

  const removePerAppLimit = (index: number) => {
    setPerAppLimits(perAppLimits.filter((_, i) => i !== index));
  };

  // Schedules
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
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    <ScrollView className="flex-1 bg-surface-secondary">
      {/* Daily Limit */}
      <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleMedium" className="font-bold text-slate-800">
          Daily Screen Time Limit
        </Text>
        <View className="flex-row items-center mt-3 gap-2">
          <TextInput
            mode="outlined"
            value={dailyLimit}
            onChangeText={setDailyLimit}
            keyboardType="number-pad"
            maxLength={4}
            className="w-24 text-center bg-white"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            dense
          />
          <Text variant="bodyMedium" className="text-slate-500">minutes</Text>
          <Text variant="bodySmall" className="text-primary-600 font-medium">
            ({formatDuration(parseInt(dailyLimit, 10) || 0)})
          </Text>
        </View>

        {/* Quick presets */}
        <View className="flex-row mt-3 gap-2 flex-wrap">
          {[30, 60, 120, 180, 240].map((mins) => (
            <Chip
              key={mins}
              selected={parseInt(dailyLimit, 10) === mins}
              onPress={() => setDailyLimit(String(mins))}
              selectedColor={colors.white}
              showSelectedOverlay
              style={
                parseInt(dailyLimit, 10) === mins
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceTertiary }
              }
              textStyle={
                parseInt(dailyLimit, 10) === mins
                  ? { color: colors.white }
                  : { color: colors.textSecondary }
              }
              compact
            >
              {formatDuration(mins)}
            </Chip>
          ))}
        </View>
      </Surface>

      {/* Per-App Limits */}
      <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleMedium" className="font-bold text-slate-800">
          Per-App Limits
        </Text>
        <Text variant="bodySmall" className="text-slate-500 mt-1 mb-3">
          Set individual time limits for specific apps.
        </Text>

        {/* Add per-app form */}
        <View className="gap-2 mb-3">
          <TouchableRipple
            className="flex-row items-center bg-surface-secondary rounded-xl px-3.5 py-3 gap-2"
            onPress={() => setPickerVisible(true)}
            borderless
          >
            <>
              <Ionicons name="cube-outline" size={20} color={selectedApp ? colors.text : colors.textLight} />
              <Text
                variant="bodyMedium"
                className={`flex-1 ${selectedApp ? 'text-slate-800' : 'text-slate-400'}`}
              >
                {selectedApp ? selectedApp.appName : 'Choose an app...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textLight} />
            </>
          </TouchableRipple>
          <View className="flex-row items-center gap-2">
            <TextInput
              mode="outlined"
              value={newAppLimit}
              onChangeText={setNewAppLimit}
              placeholder="30"
              keyboardType="number-pad"
              maxLength={4}
              className="flex-1 bg-white"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              dense
            />
            <Text variant="bodyMedium" className="text-slate-500">min/day</Text>
            <IconButton
              icon={() => <Ionicons name="add" size={22} color={colors.white} />}
              mode="contained"
              containerColor={colors.primary}
              size={22}
              onPress={addPerAppLimit}
            />
          </View>
        </View>

        {/* Per-app list */}
        {perAppLimits.length === 0 ? (
          <Text variant="bodySmall" className="text-slate-400 text-center py-4">
            No per-app limits set.
          </Text>
        ) : (
          perAppLimits.map((app, index) => (
            <View
              key={index}
              className="flex-row items-center py-2.5 border-b border-slate-200 gap-2.5"
            >
              <View className="flex-1">
                <Text variant="bodyMedium" className="font-medium text-slate-800" numberOfLines={1}>
                  {app.appName || app.appId}
                </Text>
                <Text variant="labelSmall" className="text-slate-400 mt-0.5 font-mono" numberOfLines={1}>
                  {app.appId}
                </Text>
              </View>
              <Text variant="bodyMedium" className="font-semibold text-primary-600">
                {formatDuration(app.limitMin)}
              </Text>
              <IconButton
                icon={() => <Ionicons name="close-circle-outline" size={20} color={colors.textLight} />}
                size={20}
                onPress={() => removePerAppLimit(index)}
                className="m-0"
              />
            </View>
          ))
        )}
      </Surface>

      {/* Schedules */}
      <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
        <View className="flex-row justify-between items-center">
          <Text variant="titleMedium" className="font-bold text-slate-800">
            Blocked Schedules
          </Text>
          <IconButton
            icon={() => <Ionicons name="add-circle" size={26} color={colors.primary} />}
            size={26}
            onPress={addSchedule}
            className="m-0"
          />
        </View>
        <Text variant="bodySmall" className="text-slate-500 mt-1 mb-3">
          Block device usage during specific times.
        </Text>

        {schedules.map((schedule, index) => (
          <Surface
            key={index}
            className="rounded-xl p-3.5 mt-2.5 bg-surface-secondary"
            elevation={0}
          >
            <View className="flex-row justify-between items-center mb-2.5">
              <Text variant="bodyMedium" className="font-semibold text-slate-800">
                Schedule {index + 1}
              </Text>
              <IconButton
                icon={() => <Ionicons name="trash-outline" size={20} color={colors.danger} />}
                size={20}
                onPress={() => removeSchedule(index)}
                className="m-0"
              />
            </View>

            {/* Days */}
            <View className="flex-row flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((day) => (
                <Chip
                  key={day}
                  selected={schedule.days.includes(day)}
                  onPress={() => toggleDay(index, day)}
                  compact
                  style={
                    schedule.days.includes(day)
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }
                  }
                  textStyle={
                    schedule.days.includes(day)
                      ? { color: colors.white, fontSize: 12 }
                      : { color: colors.textSecondary, fontSize: 12 }
                  }
                >
                  {day.slice(0, 3)}
                </Chip>
              ))}
            </View>

            {/* Time Range */}
            <View className="flex-row items-end mt-3 gap-2">
              <View className="flex-1">
                <Text variant="labelSmall" className="text-slate-500 mb-1">Start</Text>
                <TextInput
                  mode="outlined"
                  value={schedule.startTime}
                  onChangeText={(v) => updateScheduleTime(index, 'startTime', v)}
                  placeholder="08:00"
                  className="bg-white text-center"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  dense
                />
              </View>
              <Text variant="bodyMedium" className="text-slate-500 pb-2">to</Text>
              <View className="flex-1">
                <Text variant="labelSmall" className="text-slate-500 mb-1">End</Text>
                <TextInput
                  mode="outlined"
                  value={schedule.endTime}
                  onChangeText={(v) => updateScheduleTime(index, 'endTime', v)}
                  placeholder="15:00"
                  className="bg-white text-center"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  dense
                />
              </View>
            </View>
          </Surface>
        ))}

        {schedules.length === 0 && (
          <Text variant="bodySmall" className="text-slate-400 text-center py-4">
            No blocked schedules. Tap + to add one.
          </Text>
        )}
      </Surface>

      {/* Save Button */}
      <View className="mx-4 mt-6">
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          buttonColor={colors.primary}
          textColor={colors.white}
          contentStyle={{ paddingVertical: 8 }}
          className="rounded-xl"
        >
          Save Changes
        </Button>
      </View>

      <View className="h-10" />
    </ScrollView>

    {/* App Picker Modal */}
    <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-surface-secondary">
        <View className="flex-row justify-between items-center px-4 pt-4 pb-3">
          <Text variant="titleLarge" className="font-bold text-slate-800">
            Choose App
          </Text>
          <IconButton
            icon={() => <Ionicons name="close" size={24} color={colors.text} />}
            size={24}
            onPress={() => { setPickerVisible(false); setSearchQuery(''); }}
            className="m-0"
          />
        </View>
        <View className="flex-row items-center bg-white mx-4 rounded-xl px-3 mb-2 gap-2">
          <Ionicons name="search" size={20} color={colors.textLight} />
          <TextInput
            mode="flat"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search apps..."
            placeholderTextColor={colors.textLight}
            className="flex-1 bg-white"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            dense
            autoFocus
          />
        </View>
        <FlatList
          data={availableApps}
          keyExtractor={item => item.packageName}
          renderItem={({ item }) => (
            <TouchableRipple
              className="flex-row items-center bg-white mx-4 mt-px py-3 px-4 gap-3"
              onPress={() => pickAppForLimit(item)}
              borderless
            >
              <>
                <View className="w-10 h-10 rounded-xl bg-primary-100 justify-center items-center">
                  <Ionicons name="cube-outline" size={24} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text variant="bodyMedium" className="font-medium text-slate-800">
                    {item.appName}
                  </Text>
                  <Text variant="labelSmall" className="text-slate-400 mt-0.5">
                    {item.packageName}
                  </Text>
                </View>
              </>
            </TouchableRipple>
          )}
          ListEmptyComponent={
            <Text variant="bodySmall" className="text-slate-400 text-center py-4">
              {installedApps.length === 0 ? "Child's app list not synced yet." : 'No matching apps.'}
            </Text>
          }
        />
      </View>
    </Modal>
    </>
  );
}
