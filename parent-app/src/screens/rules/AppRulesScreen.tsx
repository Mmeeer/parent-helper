import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';
import type { InstalledApp } from '../../services/api';
import { C, CARD, LABEL } from '../../theme';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'AppRules'>;
};

export default function AppRulesScreen({ route }: Props) {
  const { childId } = route.params;
  const [blockedApps, setBlockedApps] = useState<{ packageName: string; appName: string }[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [childId]),
  );

  const loadData = async () => {
    try {
      const rules = await api.getRules(childId);
      const blocked = rules.blockedApps || [];

      const devices = await api.getChildDevices(childId);
      let allApps: InstalledApp[] = [];
      for (const device of devices) {
        try {
          const apps = await api.getInstalledApps(device.id);
          allApps = [...allApps, ...apps];
        } catch {
          // Device might not have synced apps yet
        }
      }

      const uniqueApps = Array.from(
        new Map(allApps.map(a => [a.packageName, a])).values()
      );
      setInstalledApps(uniqueApps);

      setBlockedApps(
        blocked.map(pkg => {
          const found = uniqueApps.find(a => a.packageName === pkg);
          return { packageName: pkg, appName: found?.appName || pkg };
        })
      );
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const availableApps = useMemo(() => {
    const blockedPkgs = new Set(blockedApps.map(a => a.packageName));
    const filtered = installedApps.filter(a => !blockedPkgs.has(a.packageName));
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(a =>
      a.appName.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q)
    );
  }, [installedApps, blockedApps, searchQuery]);

  const addApp = (app: InstalledApp) => {
    setBlockedApps(prev => [...prev, { packageName: app.packageName, appName: app.appName }]);
    setPickerVisible(false);
    setSearchQuery('');
  };

  const removeApp = (index: number) => {
    setBlockedApps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateBlockedApps(childId, blockedApps.map(a => a.packageName));
      Alert.alert('Хадгалагдлаа', 'Аппын хаалтын дүрэм шинэчлэгдлээ.');
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Дүрмийг шинэчлэхэд алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-secondary">
      <ScrollView>
        {/* Page header */}
        <View className="mx-5 mt-6 mb-7">
          <Text style={[LABEL, { marginBottom: 6 }]}>ХЯНАЛТ</Text>
          <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>
            Аппын удирдлага
          </Text>
        </View>

        <View style={{ ...CARD, marginHorizontal: 16, marginBottom: 12, padding: 20 }}>
          <Text style={[LABEL, { marginBottom: 12 }]}>ХААГДСАН АППУУД</Text>
          <Text className="text-sm font-semibold text-ink-900 mb-1">Хаагдсан аппууд</Text>
          <Text className="text-xs text-ink-400 mb-4">
            Хүүхдийн төхөөрөмжийн аппуудаас хаах аппаа + дарж сонгоно уу.
          </Text>

          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            className="bg-ink-900 rounded-xl items-center justify-center flex-row gap-2 mb-4"
            style={{ height: 52 }}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
              Апп хаах
            </Text>
          </TouchableOpacity>

          {blockedApps.length === 0 ? (
            <View className="items-center py-6">
              <View className="w-12 h-12 rounded-full bg-ink-100 items-center justify-center mb-3">
                <Ionicons name="ban-outline" size={24} color={C.ink300} />
              </View>
              <Text className="text-xs text-ink-400 text-center">Хаагдсан апп байхгүй.</Text>
            </View>
          ) : (
            blockedApps.map((app, index) => (
              <View
                key={app.packageName}
                className="flex-row items-center py-3 gap-x-3"
                style={{ borderBottomWidth: 1, borderBottomColor: C.ink200 }}
              >
                <View
                  className="w-9 h-9 rounded-full justify-center items-center"
                  style={{ backgroundColor: '#FFF1F2' }}
                >
                  <Ionicons name="ban" size={18} color={C.red} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-ink-900" numberOfLines={1}>
                    {app.appName}
                  </Text>
                  <Text className="text-[11px] text-ink-400 mt-0.5" numberOfLines={1}>
                    {app.packageName}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeApp(index)} className="p-1">
                  <Ionicons name="close-circle" size={24} color={C.ink300} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="bg-ink-900 rounded-xl items-center justify-center mx-4 mt-2"
          style={{ height: 52, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
              Өөрчлөлт хадгалах
            </Text>
          )}
        </TouchableOpacity>

        <View className="h-10" />
      </ScrollView>

      {/* App Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-surface-secondary">
          <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
            <Text className="font-serif text-[24px] text-ink-900">Хаах апп сонгох</Text>
            <TouchableOpacity
              onPress={() => { setPickerVisible(false); setSearchQuery(''); }}
              className="p-1"
            >
              <Ionicons name="close" size={24} color={C.ink900} />
            </TouchableOpacity>
          </View>

          <View
            className="mx-4 mb-2 flex-row items-center px-3 gap-x-2"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.ink200, borderRadius: 12 }}
          >
            <Ionicons name="search" size={20} color={C.ink400} />
            <TextInput
              style={{ flex: 1, height: 48, fontSize: 14, color: C.ink900 }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Апп хайх..."
              placeholderTextColor={C.ink300}
              autoFocus
            />
          </View>

          {installedApps.length === 0 ? (
            <View className="items-center pt-[60px] px-10">
              <View className="w-16 h-16 rounded-full bg-ink-100 items-center justify-center mb-4">
                <Ionicons name="phone-portrait-outline" size={32} color={C.ink300} />
              </View>
              <Text className="text-sm font-semibold text-ink-500">Апп синхрончлогдоогүй байна</Text>
              <Text className="text-[13px] text-ink-400 text-center mt-1.5" style={{ lineHeight: 20 }}>
                Хүүхдийн төхөөрөмж аппын жагсаалтыг синхрончлоогүй байна. Prime Kids апп ажиллаж байгаа эсэхийг шалгана уу.
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableApps}
              keyExtractor={item => item.packageName}
              renderItem={({ item }) => (
                <Pressable
                  style={{ ...CARD, marginHorizontal: 16, marginBottom: 4 }}
                  className="flex-row items-center py-3 px-4 gap-x-3"
                  onPress={() => addApp(item)}
                >
                  <View className="w-10 h-10 rounded-xl bg-ink-100 justify-center items-center">
                    <Ionicons name="cube-outline" size={22} color={C.ink600} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-ink-900">
                      {item.appName}
                    </Text>
                    <Text className="text-[11px] text-ink-400 mt-0.5">
                      {item.packageName}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={C.teal} />
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="text-xs text-ink-400 text-center py-5">
                  {searchQuery ? 'Тохирох апп олдсонгүй.' : 'Бүх аппууд хаагдсан байна.'}
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
