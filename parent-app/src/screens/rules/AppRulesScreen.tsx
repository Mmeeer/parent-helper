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
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Apps</Text>
          <Text style={styles.sectionHint}>
            Tap + to choose apps to block from the child's device.
          </Text>

          <TouchableOpacity style={styles.addButton} onPress={() => setPickerVisible(true)}>
            <Ionicons name="add-circle" size={22} color={COLORS.white} />
            <Text style={styles.addButtonText}>Block an App</Text>
          </TouchableOpacity>

          {blockedApps.length === 0 ? (
            <Text style={styles.emptyText}>No apps blocked yet.</Text>
          ) : (
            blockedApps.map((app, index) => (
              <View key={app.packageName} style={styles.appRow}>
                <View style={styles.appIconCircle}>
                  <Ionicons name="ban" size={18} color={COLORS.danger} />
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName} numberOfLines={1}>{app.appName}</Text>
                  <Text style={styles.appPackage} numberOfLines={1}>{app.packageName}</Text>
                </View>
                <TouchableOpacity onPress={() => removeApp(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

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
            <Text style={styles.modalTitle}>Choose App to Block</Text>
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

          {installedApps.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="phone-portrait-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateTitle}>No apps synced yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                The child's device hasn't synced its app list. Make sure the child app is running.
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableApps}
              keyExtractor={item => item.packageName}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => addApp(item)}>
                  <View style={styles.pickerIcon}>
                    <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerAppName}>{item.appName}</Text>
                    <Text style={styles.pickerPackage}>{item.packageName}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  section: { backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sectionHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 16 },
  addButton: {
    backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
  },
  addButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  appRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  appIconCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.danger + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  appInfo: { flex: 1 },
  appName: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  appPackage: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  emptyText: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', paddingVertical: 20 },
  saveButton: {
    backgroundColor: COLORS.primary, marginHorizontal: 16, marginTop: 24,
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '600' },
  // Modal styles
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
  pickerInfo: { flex: 1 },
  pickerAppName: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  pickerPackage: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptyStateSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
});
