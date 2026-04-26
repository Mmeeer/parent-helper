import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { useTranslation } from 'react-i18next';
import { C } from '../../theme';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'AddChild'>;
};

export default function AddChildScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const ageNum = Number.parseInt(age, 10);
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('children.nameError'));
      return;
    }
    if (!age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 18) {
      Alert.alert(t('common.error'), t('children.ageError'));
      return;
    }

    setLoading(true);
    try {
      await api.createChild(name.trim(), ageNum);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('children.createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="px-5 pb-10">
        {/* Page header */}
        <View className="mt-6 mb-7">
          <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1.5">{t('children.profile')}</Text>
          <Text className="font-display font-bold text-[32px] text-gray-900 leading-9">
            {t('children.addChild')}
          </Text>
        </View>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <View className="mb-5">
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1.5">{t('children.childName')}</Text>
            <TextInput
              placeholder={t('children.enterName')}
              value={name}
              onChangeText={setName}
              autoFocus
              className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900"
              placeholderTextColor={C.gray400}
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1.5">{t('children.ageLabel')}</Text>
            <TextInput
              placeholder={t('children.enterAge')}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={2}
              className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900"
              placeholderTextColor={C.gray400}
            />
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          className={`bg-nest-500 rounded-2xl items-center justify-center mt-6 shadow-lg h-[52px] ${loading ? 'opacity-60' : 'opacity-100'}`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-display font-bold text-sm text-white tracking-tight">
              {t('children.addChild')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
