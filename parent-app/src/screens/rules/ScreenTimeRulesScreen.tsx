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
import { C } from '../../theme';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'ScreenTimeRules'>;
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
    const limitMin = Number.parseInt(dailyLimit, 10);
    if (Number.isNaN(limitMin) || limitMin < 0) {
      Alert.alert('Алдаа', 'Өдрийн хязгаарыг минутаар оруулна уу.');
      return;
    }

    setSaving(true);
    try {
      await api.updateScreenTime(childId, {
        dailyLimitMin: limitMin,
        perApp: perAppLimits,
        schedule: schedules,
      });
      Alert.alert('Хадгалагдлаа', 'Дэлгэцийн цагийн дүрэм шинэчлэгдлээ.');
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Дүрмийг шинэчлэхэд алдаа гарлаа.');
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
      Alert.alert('Алдаа', 'Эхлээд апп сонгоно уу.');
      return;
    }
    const limit = Number.parseInt(newAppLimit, 10);
    if (Number.isNaN(limit) || limit <= 0) {
      Alert.alert('Алдаа', 'Хугацааны хязгаар оруулна уу.');
      return;
    }
    if (perAppLimits.some((a) => a.appId === selectedApp.packageName)) {
      Alert.alert('Давхар', 'Энэ апп аль хэдийн хязгаартай байна.');
      return;
    }
    setPerAppLimits([...perAppLimits, { appId: selectedApp.packageName, appName: selectedApp.appName, limitMin: limit }]);
    setSelectedApp(null);
    setNewAppLimit('30');
  };

  const removePerAppLimit = (index: number) => {
    setPerAppLimits(perAppLimits.filter((_, i) => i !== index));
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

  const parsedLimit = Number.parseInt(dailyLimit, 10);

  return (
    <>
    <ScrollView className="flex-1 bg-surface">
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-1.5">ХЯНАЛТ</Text>
        <Text className="font-display text-[32px] font-bold text-gray-900 leading-9">
          Дэлгэцийн цаг
        </Text>
      </View>

      {/* Daily Limit */}
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-3">ӨДРИЙН ХЯЗГААР</Text>
        <Text className="text-sm font-display font-bold text-gray-900 mb-3">
          Өдрийн дэлгэцийн цагийн хязгаар
        </Text>
        <View className="flex-row items-center gap-2">
          <TextInput
            className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900 w-24 text-center"
            value={dailyLimit}
            onChangeText={setDailyLimit}
            keyboardType="number-pad"
            maxLength={4}
            placeholderTextColor={C.gray300}
          />
          <Text className="text-sm text-gray-500">минут</Text>
          <Text className="text-xs text-gray-400 font-medium">
            ({formatDuration(parsedLimit || 0)})
          </Text>
        </View>

        {/* Quick presets */}
        <View className="flex-row mt-3 gap-2 flex-wrap">
          {[30, 60, 120, 180, 240].map((mins) => (
            <TouchableOpacity
              key={mins}
              onPress={() => setDailyLimit(String(mins))}
              className={`px-3 py-1.5 rounded-full ${parsedLimit === mins ? 'bg-nest-500' : 'bg-gray-100'}`}
            >
              <Text
                className={`text-xs font-medium ${parsedLimit === mins ? 'text-white' : 'text-gray-500'}`}
              >
                {formatDuration(mins)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Per-App Limits */}
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-3">АППЫН ХЯЗГААР</Text>
        <Text className="text-sm font-display font-bold text-gray-900 mb-1">Аппын хязгаар</Text>
        <Text className="text-xs text-gray-400 mb-4">
          Тодорхой аппуудад хугацааны хязгаар тохируулах.
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
              {selectedApp ? selectedApp.appName : 'Апп сонгох...'}
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
            <Text className="text-sm text-gray-500">мин/өдөр</Text>
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
            Аппын хязгаар тохируулаагүй.
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

      {/* Schedules */}
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-xs text-gray-400 font-bold uppercase">ХААГДСАН ХУВААРЬ</Text>
          <TouchableOpacity onPress={addSchedule} className="p-1">
            <Ionicons name="add-circle" size={26} color={C.nest500} />
          </TouchableOpacity>
        </View>
        <Text className="text-sm font-display font-bold text-gray-900 mb-1">Хаагдсан хуваарь</Text>
        <Text className="text-xs text-gray-400 mb-3">
          Тодорхой цагуудад төхөөрөмжийн хэрэглээг хаах.
        </Text>

        {schedules.map((schedule, index) => (
          <View
            key={index}
            className="rounded-2xl p-3.5 mt-2.5 bg-gray-100"
          >
            <View className="flex-row justify-between items-center mb-2.5">
              <Text className="text-sm font-display font-bold text-gray-900">
                {index + 1}-р хуваарь
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
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Range */}
            <View className="flex-row items-end mt-3 gap-2">
              <View className="flex-1">
                <Text className="text-[11px] text-gray-400 mb-1">Эхлэх</Text>
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
                <Text className="text-[11px] text-gray-400 mb-1">Дуусах</Text>
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
            Хаагдсан хуваарь байхгүй. + дарж нэмнэ үү.
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
            Өөрчлөлт хадгалах
          </Text>
        )}
      </TouchableOpacity>

      <View className="h-10" />
    </ScrollView>

    {/* App Picker Modal */}
    <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-surface">
        <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
          <Text className="font-display text-[24px] font-bold text-gray-900">Апп сонгох</Text>
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
            placeholder="Апп хайх..."
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
              <View className="w-10 h-10 rounded-xl bg-nest-50 justify-center items-center">
                <Ionicons name="cube-outline" size={22} color={C.nest500} />
              </View>
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
              {installedApps.length === 0 ? 'Хүүхдийн аппын жагсаалт синхрончлогдоогүй байна.' : 'Тохирох апп олдсонгүй.'}
            </Text>
          }
        />
      </View>
    </Modal>
    </>
  );
}
