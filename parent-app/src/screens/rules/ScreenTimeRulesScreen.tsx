import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <>
    <ScrollView className="flex-1 bg-surface-secondary">
      {/* Daily Limit */}
      <View className="mx-4 mt-4 rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <Text className="text-base font-bold text-slate-800">
          Daily Screen Time Limit
        </Text>
        <View className="flex-row items-center mt-3 gap-2">
          <TextInput
            className="w-24 text-center bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm text-slate-800"
            value={dailyLimit}
            onChangeText={setDailyLimit}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Text className="text-sm text-slate-500">minutes</Text>
          <Text className="text-xs text-primary-600 font-medium">
            ({formatDuration(parseInt(dailyLimit, 10) || 0)})
          </Text>
        </View>

        {/* Quick presets */}
        <View className="flex-row mt-3 gap-2 flex-wrap">
          {[30, 60, 120, 180, 240].map((mins) => (
            <TouchableOpacity
              key={mins}
              onPress={() => setDailyLimit(String(mins))}
              className={`px-3 py-1.5 rounded-xl ${parseInt(dailyLimit, 10) === mins ? 'bg-primary-600' : 'bg-slate-100'}`}
            >
              <Text className={`${parseInt(dailyLimit, 10) === mins ? 'text-white' : 'text-slate-500'} text-xs font-medium`}>
                {formatDuration(mins)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Per-App Limits */}
      <View className="mx-4 mt-4 rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <Text className="text-base font-bold text-slate-800">
          Per-App Limits
        </Text>
        <Text className="text-xs text-slate-500 mt-1 mb-3">
          Set individual time limits for specific apps.
        </Text>

        {/* Add per-app form */}
        <View className="gap-2 mb-3">
          <Pressable
            className="flex-row items-center bg-surface-secondary rounded-xl px-3.5 py-3 gap-2"
            onPress={() => setPickerVisible(true)}
          >
            <Ionicons name="cube-outline" size={20} color={selectedApp ? '#1E293B' : '#64748B'} />
            <Text
              className={`flex-1 text-sm ${selectedApp ? 'text-slate-800' : 'text-slate-400'}`}
            >
              {selectedApp ? selectedApp.appName : 'Choose an app...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748B" />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm text-slate-800"
              value={newAppLimit}
              onChangeText={setNewAppLimit}
              placeholder="30"
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text className="text-sm text-slate-500">min/day</Text>
            <TouchableOpacity
              className="w-10 h-10 rounded-xl bg-primary-600 items-center justify-center"
              onPress={addPerAppLimit}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Per-app list */}
        {perAppLimits.length === 0 ? (
          <Text className="text-xs text-slate-400 text-center py-4">
            No per-app limits set.
          </Text>
        ) : (
          perAppLimits.map((app, index) => (
            <View
              key={index}
              className="flex-row items-center py-2.5 border-b border-slate-200 gap-2.5"
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-800" numberOfLines={1}>
                  {app.appName || app.appId}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5 font-mono" numberOfLines={1}>
                  {app.appId}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-primary-600">
                {formatDuration(app.limitMin)}
              </Text>
              <TouchableOpacity onPress={() => removePerAppLimit(index)} className="p-1">
                <Ionicons name="close-circle-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Schedules */}
      <View className="mx-4 mt-4 rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <View className="flex-row justify-between items-center">
          <Text className="text-base font-bold text-slate-800">
            Blocked Schedules
          </Text>
          <TouchableOpacity onPress={addSchedule} className="p-1">
            <Ionicons name="add-circle" size={26} color="#4F46E5" />
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-slate-500 mt-1 mb-3">
          Block device usage during specific times.
        </Text>

        {schedules.map((schedule, index) => (
          <View
            key={index}
            className="rounded-xl p-3.5 mt-2.5 bg-surface-secondary"
          >
            <View className="flex-row justify-between items-center mb-2.5">
              <Text className="text-sm font-semibold text-slate-800">
                Schedule {index + 1}
              </Text>
              <TouchableOpacity onPress={() => removeSchedule(index)} className="p-1">
                <Ionicons name="trash-outline" size={20} color="#E11D48" />
              </TouchableOpacity>
            </View>

            {/* Days */}
            <View className="flex-row flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleDay(index, day)}
                  className={`px-3 py-1.5 rounded-xl ${schedule.days.includes(day) ? 'bg-primary-600' : 'bg-white border border-slate-200'}`}
                >
                  <Text className={`${schedule.days.includes(day) ? 'text-white' : 'text-slate-500'} text-xs font-medium`}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Range */}
            <View className="flex-row items-end mt-3 gap-2">
              <View className="flex-1">
                <Text className="text-[11px] text-slate-500 mb-1">Start</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm text-slate-800 text-center"
                  value={schedule.startTime}
                  onChangeText={(v) => updateScheduleTime(index, 'startTime', v)}
                  placeholder="08:00"
                />
              </View>
              <Text className="text-sm text-slate-500 pb-2">to</Text>
              <View className="flex-1">
                <Text className="text-[11px] text-slate-500 mb-1">End</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm text-slate-800 text-center"
                  value={schedule.endTime}
                  onChangeText={(v) => updateScheduleTime(index, 'endTime', v)}
                  placeholder="15:00"
                />
              </View>
            </View>
          </View>
        ))}

        {schedules.length === 0 && (
          <Text className="text-xs text-slate-400 text-center py-4">
            No blocked schedules. Tap + to add one.
          </Text>
        )}
      </View>

      {/* Save Button */}
      <View className="mx-4 mt-6">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`rounded-xl py-3.5 items-center justify-center ${saving ? 'bg-primary-400' : 'bg-primary-600'}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="h-10" />
    </ScrollView>

    {/* App Picker Modal */}
    <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-surface-secondary">
        <View className="flex-row justify-between items-center px-4 pt-4 pb-3">
          <Text className="text-lg font-bold text-slate-800">
            Choose App
          </Text>
          <TouchableOpacity
            onPress={() => { setPickerVisible(false); setSearchQuery(''); }}
            className="p-1"
          >
            <Ionicons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center bg-white mx-4 rounded-xl px-3 mb-2 gap-2">
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            className="flex-1 bg-transparent h-12 text-sm text-slate-800"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search apps..."
            placeholderTextColor="#64748B"
            autoFocus
          />
        </View>
        <FlatList
          data={availableApps}
          keyExtractor={item => item.packageName}
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center bg-white mx-4 mt-px py-3 px-4 gap-3"
              onPress={() => pickAppForLimit(item)}
            >
              <View className="w-10 h-10 rounded-xl bg-primary-100 justify-center items-center">
                <Ionicons name="cube-outline" size={24} color="#4F46E5" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-800">
                  {item.appName}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-0.5">
                  {item.packageName}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-xs text-slate-400 text-center py-4">
              {installedApps.length === 0 ? "Child's app list not synced yet." : 'No matching apps.'}
            </Text>
          }
        />
      </View>
    </Modal>
    </>
  );
}
