import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, DAYS_OF_WEEK } from '../../utils/constants';
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

  // ─── Schedules ─────────────────────────────────────
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container}>
      {/* Daily Limit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Screen Time Limit</Text>
        <View style={styles.limitRow}>
          <TextInput
            style={styles.limitInput}
            value={dailyLimit}
            onChangeText={setDailyLimit}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Text style={styles.limitUnit}>minutes</Text>
          <Text style={styles.limitFormatted}>({formatDuration(parseInt(dailyLimit, 10) || 0)})</Text>
        </View>

        {/* Quick presets */}
        <View style={styles.presetRow}>
          {[30, 60, 120, 180, 240].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.presetButton,
                parseInt(dailyLimit, 10) === mins && styles.presetActive,
              ]}
              onPress={() => setDailyLimit(String(mins))}
            >
              <Text
                style={[
                  styles.presetText,
                  parseInt(dailyLimit, 10) === mins && styles.presetTextActive,
                ]}
              >
                {formatDuration(mins)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Per-App Limits */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Per-App Limits</Text>
        </View>
        <Text style={styles.sectionHint}>
          Set individual time limits for specific apps.
        </Text>

        {/* Add per-app form */}
        <View style={styles.addAppForm}>
          <TouchableOpacity style={styles.appPickerButton} onPress={() => setPickerVisible(true)}>
            <Ionicons name="cube-outline" size={20} color={selectedApp ? COLORS.text : COLORS.textLight} />
            <Text style={[styles.appPickerText, !selectedApp && { color: COLORS.textLight }]}>
              {selectedApp ? selectedApp.appName : 'Choose an app...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={styles.addAppRow}>
            <TextInput
              style={[styles.addAppInput, { flex: 1 }]}
              value={newAppLimit}
              onChangeText={setNewAppLimit}
              placeholder="30"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.addAppUnit}>min/day</Text>
            <TouchableOpacity style={styles.addAppButton} onPress={addPerAppLimit}>
              <Ionicons name="add" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Per-app list */}
        {perAppLimits.length === 0 ? (
          <Text style={styles.emptyText}>No per-app limits set.</Text>
        ) : (
          perAppLimits.map((app, index) => (
            <View key={index} style={styles.perAppRow}>
              <View style={styles.perAppInfo}>
                <Text style={styles.perAppName} numberOfLines={1}>
                  {app.appName || app.appId}
                </Text>
                <Text style={styles.perAppId} numberOfLines={1}>{app.appId}</Text>
              </View>
              <Text style={styles.perAppLimit}>{formatDuration(app.limitMin)}</Text>
              <TouchableOpacity onPress={() => removePerAppLimit(index)}>
                <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Schedules */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Blocked Schedules</Text>
          <TouchableOpacity onPress={addSchedule}>
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionHint}>
          Block device usage during specific times.
        </Text>

        {schedules.map((schedule, index) => (
          <View key={index} style={styles.scheduleCard}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleLabel}>Schedule {index + 1}</Text>
              <TouchableOpacity onPress={() => removeSchedule(index)}>
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            {/* Days */}
            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    schedule.days.includes(day) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleDay(index, day)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      schedule.days.includes(day) && styles.dayChipTextActive,
                    ]}
                  >
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Range */}
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Start</Text>
                <TextInput
                  style={styles.timeInput}
                  value={schedule.startTime}
                  onChangeText={(v) => updateScheduleTime(index, 'startTime', v)}
                  placeholder="08:00"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
              <Text style={styles.timeSeparator}>to</Text>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>End</Text>
                <TextInput
                  style={styles.timeInput}
                  value={schedule.endTime}
                  onChangeText={(v) => updateScheduleTime(index, 'endTime', v)}
                  placeholder="15:00"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>
          </View>
        ))}

        {schedules.length === 0 && (
          <Text style={styles.emptyText}>
            No blocked schedules. Tap + to add one.
          </Text>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>

    {/* App Picker Modal */}
    <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose App</Text>
          <TouchableOpacity onPress={() => { setPickerVisible(false); setSearchQuery(''); }}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search apps..."
            placeholderTextColor={COLORS.textLight}
            autoFocus
          />
        </View>
        <FlatList
          data={availableApps}
          keyExtractor={item => item.packageName}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerRow} onPress={() => pickAppForLimit(item)}>
              <View style={styles.pickerIcon}>
                <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerAppName}>{item.appName}</Text>
                <Text style={styles.pickerPackage}>{item.packageName}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {installedApps.length === 0 ? "Child's app list not synced yet." : 'No matching apps.'}
            </Text>
          }
        />
      </View>
    </Modal>
    </>
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
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  limitInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    width: 100,
    textAlign: 'center',
  },
  limitUnit: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  limitFormatted: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  presetRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  presetActive: {
    backgroundColor: COLORS.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  presetTextActive: {
    color: COLORS.white,
  },
  // Per-App Limits
  addAppForm: {
    gap: 8,
    marginBottom: 12,
  },
  addAppInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  addAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addAppUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  addAppButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  perAppInfo: {
    flex: 1,
  },
  perAppName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  perAppId: {
    fontSize: 11,
    color: COLORS.textLight,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  perAppLimit: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Schedules
  scheduleCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dayChipTextActive: {
    color: COLORS.white,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
  appPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 8,
  },
  appPickerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, marginBottom: 8, gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: 1, paddingVertical: 12, paddingHorizontal: 16, gap: 12,
  },
  pickerIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerAppName: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  pickerPackage: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
});
