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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';
import type { InstalledApp } from '../../services/api';
import { C } from '../../theme';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'AppRules'>;
};

export default function AppRulesScreen({ route }: Props) {
  const { childId } = route.params;
  const { t } = useTranslation();
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
      Alert.alert(t('appRules.saved'), t('appRules.savedDesc'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('appRules.updateError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView>
        {/* Page header */}
        <View className="mx-5 mt-6 mb-7">
          <Text className="text-xs text-gray-400 font-bold uppercase mb-1.5">{t('appRules.control')}</Text>
          <Text className="font-display text-[32px] font-bold text-gray-900 leading-9">
            {t('appRules.appManagement')}
          </Text>
        </View>

        <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
          <Text className="text-xs text-gray-400 font-bold uppercase mb-3">{t('appRules.blockedApps')}</Text>
          <Text className="text-sm font-display font-bold text-gray-900 mb-1">{t('appRules.blockedAppsTitle')}</Text>
          <Text className="text-xs text-gray-400 mb-4">
            {t('appRules.blockedAppsDesc')}
          </Text>

          <TouchableOpacity
            onPress={() => setPickerVisible(true)}
            className="bg-nest-500 rounded-2xl items-center justify-center flex-row gap-2 mb-4 h-[52px]"
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text className="text-sm font-display font-bold text-white tracking-tight">
              {t('appRules.blockApp')}
            </Text>
          </TouchableOpacity>

          {blockedApps.length === 0 ? (
            <View className="items-center py-6">
              <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-3">
                <Ionicons name="ban-outline" size={24} color={C.gray300} />
              </View>
              <Text className="text-xs text-gray-400 text-center">{t('appRules.noBlockedApps')}</Text>
            </View>
          ) : (
            blockedApps.map((app, index) => (
              <View
                key={app.packageName}
                className="flex-row items-center py-3 gap-x-3 border-b border-gray-200"
              >
                <View
                  className="w-9 h-9 rounded-xl justify-center items-center bg-danger-50"
                >
                  <Ionicons name="ban" size={18} color={C.danger500} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                    {app.appName}
                  </Text>
                  <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
                    {app.packageName}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeApp(index)} className="p-1">
                  <Ionicons name="close-circle" size={24} color={C.gray300} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className={`bg-nest-500 rounded-2xl items-center justify-center mx-4 mt-2 h-[52px] ${saving ? 'opacity-60' : 'opacity-100'}`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-display font-bold text-white tracking-tight">
              {t('appRules.saveChanges')}
            </Text>
          )}
        </TouchableOpacity>

        <View className="h-10" />
      </ScrollView>

      {/* App Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-surface">
          <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
            <Text className="font-display text-[24px] font-bold text-gray-900">{t('appRules.selectAppToBlock')}</Text>
            <TouchableOpacity
              onPress={() => { setPickerVisible(false); setSearchQuery(''); }}
              className="p-1"
            >
              <Ionicons name="close" size={24} color={C.gray900} />
            </TouchableOpacity>
          </View>

          <View
            className="mx-4 mb-2 flex-row items-center rounded-2xl bg-gray-50 border border-gray-200 px-4 gap-x-2"
          >
            <Ionicons name="search" size={20} color={C.gray400} />
            <TextInput
              className="flex-1 h-12 text-sm text-gray-900"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('appRules.searchApp')}
              placeholderTextColor={C.gray300}
              autoFocus
            />
          </View>

          {installedApps.length === 0 ? (
            <View className="items-center pt-[60px] px-10">
              <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="phone-portrait-outline" size={32} color={C.gray300} />
              </View>
              <Text className="text-sm font-semibold text-gray-500">{t('appRules.appsNotSynced')}</Text>
              <Text className="text-[13px] text-gray-400 text-center mt-1.5 leading-5">
                {t('appRules.appsNotSyncedDesc')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableApps}
              keyExtractor={item => item.packageName}
              renderItem={({ item }) => (
                <Pressable
                  className="bg-white rounded-3xl mx-4 mb-1 flex-row items-center py-3 px-4 gap-x-3 border border-gray-100"
                  onPress={() => addApp(item)}
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
                  <Ionicons name="add-circle-outline" size={24} color={C.safe500} />
                </Pressable>
              )}
              ListEmptyComponent={
                <Text className="text-xs text-gray-400 text-center py-5">
                  {searchQuery ? t('appRules.noMatchingApps') : t('appRules.allAppsBlocked')}
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
