import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton, Switch, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { WEB_FILTER_CATEGORIES } from '../../utils/constants';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';

type Props = {
  route: RouteProp<RootStackParamList, 'WebFilter'>;
};

export default function WebFilterScreen({ route }: Props) {
  const { childId } = route.params;
  const [categories, setCategories] = useState<string[]>(['adult', 'gambling', 'violence']);
  const [customBlock, setCustomBlock] = useState<string[]>([]);
  const [customAllow, setCustomAllow] = useState<string[]>([]);
  const [newBlockDomain, setNewBlockDomain] = useState('');
  const [newAllowDomain, setNewAllowDomain] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const addDomain = (list: 'block' | 'allow') => {
    const domain = (list === 'block' ? newBlockDomain : newAllowDomain).trim().toLowerCase();
    if (!domain) return;
    if (list === 'block') {
      if (customBlock.includes(domain)) return;
      setCustomBlock([...customBlock, domain]);
      setNewBlockDomain('');
    } else {
      if (customAllow.includes(domain)) return;
      setCustomAllow([...customAllow, domain]);
      setNewAllowDomain('');
    }
  };

  const removeDomain = (list: 'block' | 'allow', index: number) => {
    if (list === 'block') {
      setCustomBlock(customBlock.filter((_, i) => i !== index));
    } else {
      setCustomAllow(customAllow.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateWebFilter(childId, { categories, customBlock, customAllow });
      Alert.alert('Saved', 'Web filter rules updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update rules.');
    } finally {
      setSaving(false);
    }
  };

  const formatCategory = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      {/* Category Filters */}
      <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleMedium" className="font-bold text-slate-800">
          Content Categories
        </Text>
        <Text variant="bodySmall" className="text-slate-500 mt-1 mb-3">
          Block websites in these categories.
        </Text>

        {WEB_FILTER_CATEGORIES.map((cat, index) => (
          <View key={cat}>
            <View className="flex-row justify-between items-center py-2.5">
              <Text variant="bodyMedium" className="text-slate-800">
                {formatCategory(cat)}
              </Text>
              <Switch
                value={categories.includes(cat)}
                onValueChange={() => toggleCategory(cat)}
                color={colors.primary}
              />
            </View>
            {index < WEB_FILTER_CATEGORIES.length - 1 && <Divider />}
          </View>
        ))}
      </Surface>

      {/* Custom Block List */}
      <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleMedium" className="font-bold text-slate-800">
          Custom Blocked Domains
        </Text>
        <View className="flex-row gap-2 mt-2 mb-2">
          <TextInput
            mode="outlined"
            value={newBlockDomain}
            onChangeText={setNewBlockDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('block')}
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
            onPress={() => addDomain('block')}
          />
        </View>
        {customBlock.map((domain, index) => (
          <View key={index} className="flex-row items-center py-2 gap-2">
            <Ionicons name="ban" size={16} color={colors.danger} />
            <Text variant="bodyMedium" className="flex-1 text-slate-800">
              {domain}
            </Text>
            <IconButton
              icon={() => <Ionicons name="close-circle-outline" size={18} color={colors.textLight} />}
              size={18}
              iconColor={colors.textLight}
              onPress={() => removeDomain('block', index)}
              className="m-0"
            />
          </View>
        ))}
      </Surface>

      {/* Custom Allow List */}
      <Surface className="mx-4 mt-4 rounded-2xl p-4" elevation={1}>
        <Text variant="titleMedium" className="font-bold text-slate-800">
          Custom Allowed Domains
        </Text>
        <Text variant="bodySmall" className="text-slate-500 mt-1 mb-2">
          These domains will always be accessible, even if their category is blocked.
        </Text>
        <View className="flex-row gap-2 mt-1 mb-2">
          <TextInput
            mode="outlined"
            value={newAllowDomain}
            onChangeText={setNewAllowDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('allow')}
            className="flex-1 bg-white"
            outlineColor={colors.border}
            activeOutlineColor={colors.secondary}
            dense
          />
          <IconButton
            icon={() => <Ionicons name="add" size={22} color={colors.white} />}
            mode="contained"
            containerColor={colors.secondary}
            iconColor={colors.white}
            size={22}
            onPress={() => addDomain('allow')}
          />
        </View>
        {customAllow.map((domain, index) => (
          <View key={index} className="flex-row items-center py-2 gap-2">
            <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
            <Text variant="bodyMedium" className="flex-1 text-slate-800">
              {domain}
            </Text>
            <IconButton
              icon={() => <Ionicons name="close-circle-outline" size={18} color={colors.textLight} />}
              size={18}
              iconColor={colors.textLight}
              onPress={() => removeDomain('allow', index)}
              className="m-0"
            />
          </View>
        ))}
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
  );
}
