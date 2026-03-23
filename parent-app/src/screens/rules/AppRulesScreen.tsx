import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
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
    <ScrollView className="flex-1 bg-surface-secondary">
      <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleMedium" className="font-bold text-slate-800">
          Blocked Apps
        </Text>
        <Text variant="bodySmall" className="text-slate-500 mt-1 mb-4">
          Enter package names of apps to block (e.g., com.instagram.android).
        </Text>

        <View className="flex-row gap-2 mb-3">
          <TextInput
            mode="outlined"
            value={newApp}
            onChangeText={setNewApp}
            placeholder="com.example.app"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={addApp}
            className="flex-1 bg-white"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            dense
          />
          <IconButton
            icon={() => <Ionicons name="add" size={22} color={colors.white} />}
            mode="contained"
            containerColor={colors.primary}
            iconColor={colors.white}
            size={22}
            onPress={addApp}
          />
        </View>

        {blockedApps.length === 0 ? (
          <Text variant="bodySmall" className="text-slate-400 text-center py-5">
            No apps blocked yet.
          </Text>
        ) : (
          blockedApps.map((app, index) => (
            <View
              key={index}
              className="flex-row items-center py-2.5 border-b border-slate-200 gap-2.5"
            >
              <Ionicons name="ban" size={18} color={colors.danger} />
              <Text
                variant="bodyMedium"
                className="flex-1 text-slate-800 font-mono"
                numberOfLines={1}
              >
                {app}
              </Text>
              <IconButton
                icon={() => <Ionicons name="close-circle-outline" size={20} color={colors.textLight} />}
                size={20}
                iconColor={colors.textLight}
                onPress={() => removeApp(index)}
                className="m-0"
              />
            </View>
          ))
        )}
      </Surface>

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
  );
}
