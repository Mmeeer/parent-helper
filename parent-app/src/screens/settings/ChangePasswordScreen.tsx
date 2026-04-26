import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import { C } from '../../theme';
import { useTranslation } from 'react-i18next';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const isValid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSave = async () => {
    if (!currentPassword) {
      Alert.alert(t('common.error'), t('changePassword.enterCurrent'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('changePassword.min8Error'));
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      Alert.alert(t('common.error'), t('changePassword.letterAndNumber'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('changePassword.mismatch'));
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert(t('common.success'), t('changePassword.success'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('changePassword.error'));
    } finally {
      setLoading(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    placeholder: string,
    secure: boolean,
    showToggle?: boolean,
    onToggle?: () => void,
  ) => (
    <View className="mb-4">
      <Text className="text-xs text-gray-400 font-bold px-1 mb-2">{label}</Text>
      <View className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.gray400}
          secureTextEntry={secure}
          className="flex-1 text-sm text-gray-900 font-semibold"
          editable={!loading}
          autoCapitalize="none"
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.gray400} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface"
    >
      <View className="flex-1 px-6 pt-6">
        {renderField(t('changePassword.currentPassword'), currentPassword, setCurrentPassword, t('changePassword.currentPasswordPlaceholder'), !showCurrent, true, () => setShowCurrent((v) => !v))}
        {renderField(t('changePassword.newPassword'), newPassword, setNewPassword, t('changePassword.newPasswordPlaceholder'), !showNew, true, () => setShowNew((v) => !v))}
        {renderField(t('changePassword.confirmPassword'), confirmPassword, setConfirmPassword, t('changePassword.confirmPasswordPlaceholder'), true)}

        {newPassword.length > 0 && newPassword.length < 8 && (
          <Text className="text-xs text-danger-400 font-semibold px-1 -mt-2 mb-4">
            {t('changePassword.min8Warning')}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !isValid}
          className="w-full py-3.5 rounded-2xl items-center justify-center mt-4"
          style={{ backgroundColor: loading || !isValid ? C.nest200 : C.nest500 }}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="font-display font-bold text-sm text-white">{t('changePassword.changePasswordBtn')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
