import React, { useState } from 'react';
import { View, ScrollView, Alert, TextInput, Switch, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEB_FILTER_CATEGORIES } from '../../utils/constants';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';

type Props = {
  readonly route: RouteProp<RootStackParamList, 'WebFilter'>;
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
      Alert.alert('Хадгалагдлаа', 'Вэб шүүлтийн дүрэм шинэчлэгдлээ.');
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Дүрмийг шинэчлэхэд алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  const formatCategory = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      {/* Category Filters */}
      <View className="mx-4 mt-4 rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <Text className="text-base font-bold text-slate-800">
          Агуулгын ангилал
        </Text>
        <Text className="text-xs text-slate-500 mt-1 mb-3">
          Эдгээр ангиллын вэбсайтыг хаах.
        </Text>

        {WEB_FILTER_CATEGORIES.map((cat, index) => (
          <View key={cat}>
            <View className="flex-row justify-between items-center py-2.5">
              <Text className="text-sm text-slate-800">
                {formatCategory(cat)}
              </Text>
              <Switch
                value={categories.includes(cat)}
                onValueChange={() => toggleCategory(cat)}
                trackColor={{ true: '#4F46E5', false: '#E2E8F0' }}
                thumbColor="#FFFFFF"
              />
            </View>
            {index < WEB_FILTER_CATEGORIES.length - 1 && <View className="h-px bg-slate-200" />}
          </View>
        ))}
      </View>

      {/* Custom Block List */}
      <View className="mx-4 mt-4 rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <Text className="text-base font-bold text-slate-800">
          Хаагдсан домайнууд
        </Text>
        <View className="flex-row gap-2 mt-2 mb-2">
          <TextInput
            value={newBlockDomain}
            onChangeText={setNewBlockDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('block')}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm text-slate-800"
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-xl bg-primary-600 items-center justify-center self-center"
            onPress={() => addDomain('block')}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {customBlock.map((domain, index) => (
          <View key={index} className="flex-row items-center py-2 gap-2">
            <Ionicons name="ban" size={16} color="#E11D48" />
            <Text className="flex-1 text-sm text-slate-800">
              {domain}
            </Text>
            <TouchableOpacity onPress={() => removeDomain('block', index)} className="p-1">
              <Ionicons name="close-circle-outline" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Custom Allow List */}
      <View className="mx-4 mt-4 rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <Text className="text-base font-bold text-slate-800">
          Зөвшөөрөгдсөн домайнууд
        </Text>
        <Text className="text-xs text-slate-500 mt-1 mb-2">
          Эдгээр домайнууд тухайн ангилал хаагдсан байсан ч нээлттэй байна.
        </Text>
        <View className="flex-row gap-2 mt-1 mb-2">
          <TextInput
            value={newAllowDomain}
            onChangeText={setNewAllowDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('allow')}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm text-slate-800"
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-xl bg-accent-600 items-center justify-center self-center"
            onPress={() => addDomain('allow')}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {customAllow.map((domain, index) => (
          <View key={index} className="flex-row items-center py-2 gap-2">
            <Ionicons name="checkmark-circle" size={16} color="#0D9488" />
            <Text className="flex-1 text-sm text-slate-800">
              {domain}
            </Text>
            <TouchableOpacity onPress={() => removeDomain('allow', index)} className="p-1">
              <Ionicons name="close-circle-outline" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Save Button */}
      <View className="mx-4 mt-6">
        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-3 items-center justify-center"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-base">Өөрчлөлт хадгалах</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="h-10" />
    </ScrollView>
  );
}
