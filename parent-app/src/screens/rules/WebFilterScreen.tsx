import React, { useState } from 'react';
import { View, ScrollView, Alert, TextInput, Switch, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEB_FILTER_CATEGORIES } from '../../utils/constants';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';
import { C, CARD, LABEL } from '../../theme';

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
    cat.charAt(0).toUpperCase() + cat.slice(1).replaceAll('_', ' ');

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text style={[LABEL, { marginBottom: 6 }]}>ХЯНАЛТ</Text>
        <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>
          Вэб шүүлт
        </Text>
      </View>

      {/* Category Filters */}
      <View style={{ ...CARD, marginHorizontal: 16, marginBottom: 12, padding: 20 }}>
        <Text style={[LABEL, { marginBottom: 12 }]}>АГУУЛГЫН АНГИЛАЛ</Text>
        <Text className="text-sm font-semibold text-ink-900 mb-1">Агуулгын ангилал</Text>
        <Text className="text-xs text-ink-400 mb-4">
          Эдгээр ангиллын вэбсайтыг хаах.
        </Text>

        {WEB_FILTER_CATEGORIES.map((cat, index) => (
          <View key={cat}>
            <View className="flex-row justify-between items-center py-3">
              <Text className="text-sm text-ink-900">
                {formatCategory(cat)}
              </Text>
              <Switch
                value={categories.includes(cat)}
                onValueChange={() => toggleCategory(cat)}
                trackColor={{ true: C.teal, false: C.ink200 }}
                thumbColor="#FFFFFF"
              />
            </View>
            {index < WEB_FILTER_CATEGORIES.length - 1 && (
              <View style={{ height: 1, backgroundColor: C.ink200 }} />
            )}
          </View>
        ))}
      </View>

      {/* Custom Block List */}
      <View style={{ ...CARD, marginHorizontal: 16, marginBottom: 12, padding: 20 }}>
        <Text style={[LABEL, { marginBottom: 12 }]}>ХААГДСАН ДОМАЙНУУД</Text>
        <Text className="text-sm font-semibold text-ink-900 mb-3">Хаагдсан домайнууд</Text>
        <View className="flex-row gap-2 mb-3">
          <TextInput
            value={newBlockDomain}
            onChangeText={setNewBlockDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('block')}
            style={{
              flex: 1,
              backgroundColor: C.bg,
              borderWidth: 1,
              borderColor: C.ink200,
              borderRadius: 12,
              paddingHorizontal: 16,
              height: 48,
              fontSize: 14,
              color: C.ink900,
            }}
            placeholderTextColor={C.ink300}
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-xl bg-ink-900 items-center justify-center self-center"
            onPress={() => addDomain('block')}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {customBlock.map((domain, index) => (
          <View key={domain} className="flex-row items-center py-2 gap-2">
            <Ionicons name="ban" size={16} color={C.red} />
            <Text className="flex-1 text-sm text-ink-900">
              {domain}
            </Text>
            <TouchableOpacity onPress={() => removeDomain('block', index)} className="p-1">
              <Ionicons name="close-circle-outline" size={18} color={C.ink400} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Custom Allow List */}
      <View style={{ ...CARD, marginHorizontal: 16, marginBottom: 12, padding: 20 }}>
        <Text style={[LABEL, { marginBottom: 12 }]}>ЗӨВШӨӨРӨГДСӨН ДОМАЙНУУД</Text>
        <Text className="text-sm font-semibold text-ink-900 mb-1">Зөвшөөрөгдсөн домайнууд</Text>
        <Text className="text-xs text-ink-400 mb-3">
          Эдгээр домайнууд тухайн ангилал хаагдсан байсан ч нээлттэй байна.
        </Text>
        <View className="flex-row gap-2 mb-3">
          <TextInput
            value={newAllowDomain}
            onChangeText={setNewAllowDomain}
            placeholder="example.com"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => addDomain('allow')}
            style={{
              flex: 1,
              backgroundColor: C.bg,
              borderWidth: 1,
              borderColor: C.ink200,
              borderRadius: 12,
              paddingHorizontal: 16,
              height: 48,
              fontSize: 14,
              color: C.ink900,
            }}
            placeholderTextColor={C.ink300}
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-xl items-center justify-center self-center"
            style={{ backgroundColor: C.teal }}
            onPress={() => addDomain('allow')}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {customAllow.map((domain, index) => (
          <View key={domain} className="flex-row items-center py-2 gap-2">
            <Ionicons name="checkmark-circle" size={16} color={C.teal} />
            <Text className="flex-1 text-sm text-ink-900">
              {domain}
            </Text>
            <TouchableOpacity onPress={() => removeDomain('allow', index)} className="p-1">
              <Ionicons name="close-circle-outline" size={18} color={C.ink400} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        className="bg-ink-900 rounded-xl items-center justify-center mx-4 mt-2"
        style={{ height: 52, opacity: saving ? 0.6 : 1 }}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
            Өөрчлөлт хадгалах
          </Text>
        )}
      </TouchableOpacity>

      <View className="h-10" />
    </ScrollView>
  );
}
