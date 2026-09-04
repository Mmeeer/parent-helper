import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, TextInput, Switch, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { WEB_FILTER_CATEGORIES } from '../../utils/constants';
import * as api from '../../services/api';
import { isIosChild } from '../../utils/platform';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';
import { C } from '../../theme';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'WebFilter'>;
};

export default function WebFilterScreen({ route }: Props) {
  const { childId } = route.params;
  const { t } = useTranslation();
  const [categories, setCategories] = useState<string[]>(['adult', 'gambling', 'violence']);
  const [customBlock, setCustomBlock] = useState<string[]>([]);
  const [customAllow, setCustomAllow] = useState<string[]>([]);
  const [newBlockDomain, setNewBlockDomain] = useState('');
  const [newAllowDomain, setNewAllowDomain] = useState('');
  const [saving, setSaving] = useState(false);
  // iOS child: filtering is enforced by the content blocker / web-content filter on the device.
  const [iosChild, setIosChild] = useState(false);
  // iOS filter mode: block by category, or strict allow-list-only browsing.
  const [mode, setMode] = useState<'categories' | 'allowlist'>('categories');

  useEffect(() => {
    let cancelled = false;
    api.getChildDevices(childId)
      .then((devices) => { if (!cancelled) setIosChild(isIosChild(devices)); })
      .catch(() => { /* no devices yet — keep default */ });
    // Load the saved filter so the form (and the iOS mode selector) reflects the server state.
    api.getRules(childId)
      .then((rules) => {
        if (cancelled) return;
        if (rules.webFilter) {
          setCategories(rules.webFilter.categories ?? []);
          setCustomBlock(rules.webFilter.customBlock ?? []);
          setCustomAllow(rules.webFilter.customAllow ?? []);
          setMode(rules.webFilter.mode === 'allowlist' ? 'allowlist' : 'categories');
        }
        setRulesLoaded(true); // safe to save: we know the server state (or that none exists)
      })
      .catch(() => { /* fetch FAILED — saving now would overwrite the server's real filter
                        with local defaults, so Save stays disabled until a retry succeeds */ });
    return () => { cancelled = true; };
  }, [childId]);

  const [rulesLoaded, setRulesLoaded] = useState(false);

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
    if (!rulesLoaded) return;
    setSaving(true);
    try {
      await api.updateWebFilter(childId, { categories, customBlock, customAllow, ...(iosChild ? { mode } : {}) });
      Alert.alert(t('webFilter.saved'), t('webFilter.savedDesc'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('webFilter.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const formatCategory = (cat: string) =>
    t(`webFilter.categories.${cat}`, cat.charAt(0).toUpperCase() + cat.slice(1).replaceAll('_', ' '));

  return (
    <ScrollView className="flex-1 bg-surface">
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-1.5">{t('webFilter.control')}</Text>
        <Text className="font-display text-[32px] font-bold text-gray-900 leading-9">
          {t('webFilter.webFilter')}
        </Text>
      </View>

      {iosChild && (
        <View className="flex-row items-start gap-x-3 bg-nest-50 rounded-2xl p-4 mx-4 mb-3">
          <Ionicons name="logo-apple" size={18} color={C.nest500} />
          <Text className="flex-1 text-xs text-gray-700 leading-4">{t('webFilter.iosSafariOnly')}</Text>
        </View>
      )}

      {/* iOS: choose between category blocking and strict allow-list-only browsing */}
      {iosChild && (
        <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
          <Text className="text-xs text-gray-400 font-bold uppercase mb-1">{t('webFilter.filterMode')}</Text>
          {([
            { value: 'categories', label: t('webFilter.modeCategories') },
            { value: 'allowlist', label: t('webFilter.modeAllowlist') },
          ] as const).map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setMode(option.value)}
              className="flex-row items-center py-3 gap-x-3"
            >
              <Ionicons
                name={mode === option.value ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={mode === option.value ? C.nest500 : C.gray300}
              />
              <Text className="flex-1 text-sm text-gray-900">{option.label}</Text>
            </TouchableOpacity>
          ))}
          {mode === 'allowlist' && (
            <Text className="text-xs text-gray-500 leading-4 mt-1">{t('webFilter.allowlistHint')}</Text>
          )}
        </View>
      )}

      {/* Category Filters — de-emphasized when the strict allow list takes over */}
      <View
        className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm"
        style={{ opacity: iosChild && mode === 'allowlist' ? 0.45 : 1 }}
      >
        <Text className="text-xs text-gray-400 font-bold uppercase mb-3">{t('webFilter.contentCategory')}</Text>
        <Text className="text-sm font-display font-bold text-gray-900 mb-1">{t('webFilter.contentCategoryTitle')}</Text>
        <Text className="text-xs text-gray-400 mb-4">
          {t('webFilter.contentCategoryDesc')}
        </Text>

        {WEB_FILTER_CATEGORIES.map((cat, index) => (
          <View key={cat}>
            <View className="flex-row justify-between items-center py-3">
              <Text className="text-sm text-gray-900">
                {formatCategory(cat)}
              </Text>
              <Switch
                value={categories.includes(cat)}
                onValueChange={() => toggleCategory(cat)}
                trackColor={{ true: C.safe500, false: C.gray200 }}
                thumbColor="#FFFFFF"
              />
            </View>
            {index < WEB_FILTER_CATEGORIES.length - 1 && (
              <View className="h-px bg-gray-200" />
            )}
          </View>
        ))}
      </View>

      {/* Custom Block List */}
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-3">{t('webFilter.blockedDomains')}</Text>
        <Text className="text-sm font-display font-bold text-gray-900 mb-3">{t('webFilter.blockedDomainsTitle')}</Text>
        <View className="flex-row gap-2 mb-3">
          <TextInput
            value={newBlockDomain}
            onChangeText={setNewBlockDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('block')}
            className="flex-1 rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900"
            placeholderTextColor={C.gray300}
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-2xl bg-nest-500 items-center justify-center self-center"
            onPress={() => addDomain('block')}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {customBlock.map((domain, index) => (
          <View key={domain} className="flex-row items-center py-2 gap-2">
            <Ionicons name="ban" size={16} color={C.danger500} />
            <Text className="flex-1 text-sm text-gray-900">
              {domain}
            </Text>
            <TouchableOpacity onPress={() => removeDomain('block', index)} className="p-1">
              <Ionicons name="close-circle-outline" size={18} color={C.gray400} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Custom Allow List */}
      <View className="bg-white rounded-3xl p-5 mx-4 mb-3 border border-gray-100 shadow-sm">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-3">{t('webFilter.allowedDomains')}</Text>
        <Text className="text-sm font-display font-bold text-gray-900 mb-1">{t('webFilter.allowedDomainsTitle')}</Text>
        <Text className="text-xs text-gray-400 mb-3">
          {t('webFilter.allowedDomainsDesc')}
        </Text>
        <View className="flex-row gap-2 mb-3">
          <TextInput
            value={newAllowDomain}
            onChangeText={setNewAllowDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('allow')}
            className="flex-1 rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900"
            placeholderTextColor={C.gray300}
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-2xl bg-safe-500 items-center justify-center self-center"
            onPress={() => addDomain('allow')}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {customAllow.map((domain, index) => (
          <View key={domain} className="flex-row items-center py-2 gap-2">
            <Ionicons name="checkmark-circle" size={16} color={C.safe500} />
            <Text className="flex-1 text-sm text-gray-900">
              {domain}
            </Text>
            <TouchableOpacity onPress={() => removeDomain('allow', index)} className="p-1">
              <Ionicons name="close-circle-outline" size={18} color={C.gray400} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        className={`bg-nest-500 rounded-2xl items-center justify-center mx-4 mt-2 h-[52px] ${saving ? 'opacity-60' : 'opacity-100'}`}
        onPress={handleSave}
        disabled={saving || !rulesLoaded}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-sm font-display font-bold text-white tracking-tight">
            {t('webFilter.saveChanges')}
          </Text>
        )}
      </TouchableOpacity>

      <View className="h-10" />
    </ScrollView>
  );
}
