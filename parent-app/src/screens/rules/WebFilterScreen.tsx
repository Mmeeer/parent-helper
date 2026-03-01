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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, WEB_FILTER_CATEGORIES } from '../../utils/constants';
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
    <ScrollView style={styles.container}>
      {/* Category Filters */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Categories</Text>
        <Text style={styles.sectionHint}>
          Block websites in these categories.
        </Text>

        {WEB_FILTER_CATEGORIES.map((cat) => (
          <View key={cat} style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>{formatCategory(cat)}</Text>
            <Switch
              value={categories.includes(cat)}
              onValueChange={() => toggleCategory(cat)}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={categories.includes(cat) ? COLORS.primary : '#F4F3F4'}
            />
          </View>
        ))}
      </View>

      {/* Custom Block List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Blocked Domains</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newBlockDomain}
            onChangeText={setNewBlockDomain}
            placeholder="example.com"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('block')}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addDomain('block')}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        {customBlock.map((domain, index) => (
          <View key={index} style={styles.domainRow}>
            <Ionicons name="ban" size={16} color={COLORS.danger} />
            <Text style={styles.domainText}>{domain}</Text>
            <TouchableOpacity onPress={() => removeDomain('block', index)}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Custom Allow List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Allowed Domains</Text>
        <Text style={styles.sectionHint}>
          These domains will always be accessible, even if their category is blocked.
        </Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newAllowDomain}
            onChangeText={setNewAllowDomain}
            placeholder="example.com"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('allow')}
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: COLORS.secondary }]}
            onPress={() => addDomain('allow')}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        {customAllow.map((domain, index) => (
          <View key={index} style={styles.domainRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.secondary} />
            <Text style={styles.domainText}>{domain}</Text>
            <TouchableOpacity onPress={() => removeDomain('allow', index)}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        ))}
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
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
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
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  domainText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
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
