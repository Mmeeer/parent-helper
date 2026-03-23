import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { Surface, Text, Button, TextInput, IconButton, TouchableRipple } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';
import type { InstalledApp } from '../../services/api';

type Props = {
  route: RouteProp<RootStackParamList, 'AppRules'>;
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
      // Load current rules
      const rules = await api.getRules(childId);
      const blocked = rules.blockedApps || [];

      // Load installed apps from all devices for this child
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

      // Deduplicate by packageName
      const uniqueApps = Array.from(
        new Map(allApps.map(a => [a.packageName, a])).values()
      );
      setInstalledApps(uniqueApps);

      // Map blocked package names to app names
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
      Alert.alert('Saved', 'App blocking rules updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update rules.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-secondary">
      <ScrollView>
        <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
          <Text variant="titleMedium" className="font-bold text-slate-800">
            Blocked Apps
          </Text>
          <Text variant="bodySmall" className="text-slate-500 mt-1 mb-4">
            Tap + to choose apps to block from the child's device.
          </Text>

          <Button
            mode="contained"
            icon={() => <Ionicons name="add-circle" size={20} color={colors.white} />}
            onPress={() => setPickerVisible(true)}
            className="rounded-xl mb-3"
          >
            Block an App
          </Button>

          {blockedApps.length === 0 ? (
            <Text variant="bodySmall" className="text-slate-400 text-center py-5">
              No apps blocked yet.
            </Text>
          ) : (
            blockedApps.map((app, index) => (
              <View key={app.packageName} className="flex-row items-center py-3 border-b border-slate-200 gap-x-3">
                <View
                  className="w-9 h-9 rounded-full justify-center items-center"
                  style={{ backgroundColor: colors.dangerLight }}
                >
                  <Ionicons name="ban" size={18} color={colors.danger} />
                </View>
                <View className="flex-1">
                  <Text variant="bodyMedium" className="font-medium text-slate-800" numberOfLines={1}>
                    {app.appName}
                  </Text>
                  <Text variant="labelSmall" className="text-slate-400 mt-0.5" numberOfLines={1}>
                    {app.packageName}
                  </Text>
                </View>
                <IconButton
                  icon={() => <Ionicons name="close-circle" size={24} color={colors.textMuted} />}
                  size={24}
                  onPress={() => removeApp(index)}
                  className="m-0"
                />
              </View>
            ))
          )}
        </Surface>

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          className="mx-4 mt-6 rounded-xl py-1"
        >
          {saving ? '' : 'Save Changes'}
        </Button>

        <View className="h-10" />
      </ScrollView>

      {/* App Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-surface-secondary">
          <View className="flex-row justify-between items-center px-4 pt-4 pb-3">
            <Text variant="headlineSmall" className="font-bold text-slate-800">
              Choose App to Block
            </Text>
            <IconButton
              icon={() => <Ionicons name="close" size={24} color={colors.text} />}
              size={24}
              onPress={() => { setPickerVisible(false); setSearchQuery(''); }}
            />
          </View>

          <Surface className="mx-4 rounded-xl mb-2 flex-row items-center px-3 gap-x-2" elevation={1}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              className="flex-1"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search apps..."
              mode="flat"
              underlineStyle={{ display: 'none' }}
              style={{ backgroundColor: 'transparent' }}
              autoFocus
            />
          </Surface>

          {installedApps.length === 0 ? (
            <View className="items-center pt-16 px-10">
              <Ionicons name="phone-portrait-outline" size={48} color={colors.textMuted} />
              <Text variant="titleMedium" className="font-semibold text-slate-800 mt-4">
                No apps synced yet
              </Text>
              <Text variant="bodyMedium" className="text-slate-500 text-center mt-2">
                The child's device hasn't synced its app list. Make sure the child app is running.
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableApps}
              keyExtractor={item => item.packageName}
              renderItem={({ item }) => (
                <TouchableRipple
                  className="flex-row items-center mx-4 mt-px py-3 px-4 gap-x-3 bg-white rounded-xl"
                  onPress={() => addApp(item)}
                >
                  <>
                    <View
                      className="w-10 h-10 rounded-xl justify-center items-center"
                      style={{ backgroundColor: colors.primaryLight }}
                    >
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
                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                  </>
                </TouchableRipple>
              )}
              ListEmptyComponent={
                <Text variant="bodySmall" className="text-slate-400 text-center py-5">
                  {searchQuery ? 'No matching apps found.' : 'All apps are already blocked.'}
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
