import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';

type Props = {
  route: RouteProp<RootStackParamList, 'AppRules'>;
};

export default function AppRulesScreen({ route }: Props) {
  const { childId } = route.params;
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [newApp, setNewApp] = useState('');
  const [saving, setSaving] = useState(false);

  const addApp = () => {
    const pkg = newApp.trim();
    if (!pkg) return;
    if (blockedApps.includes(pkg)) {
      Alert.alert('Duplicate', 'This app is already in the blocked list.');
      return;
    }
    setBlockedApps([...blockedApps, pkg]);
    setNewApp('');
  };

  const removeApp = (index: number) => {
    setBlockedApps(blockedApps.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateBlockedApps(childId, blockedApps);
      Alert.alert('Saved', 'App blocking rules updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update rules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blocked Apps</Text>
        <Text style={styles.sectionHint}>
          Enter package names of apps to block (e.g., com.instagram.android).
        </Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newApp}
            onChangeText={setNewApp}
            placeholder="com.example.app"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={addApp}
          />
          <TouchableOpacity style={styles.addButton} onPress={addApp}>
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {blockedApps.length === 0 ? (
          <Text style={styles.emptyText}>No apps blocked yet.</Text>
        ) : (
          blockedApps.map((app, index) => (
            <View key={index} style={styles.appRow}>
              <Ionicons name="ban" size={18} color={COLORS.danger} />
              <Text style={styles.appName} numberOfLines={1}>{app}</Text>
              <TouchableOpacity onPress={() => removeApp(index)}>
                <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 16,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  appName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 20,
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
});
