import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

type Step = 'email' | 'code' | 'done';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const newPasswordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('forgotPassword.enterEmailError'));
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setStep('code');
      Alert.alert(t('forgotPassword.checkEmail'), t('forgotPassword.codeSent'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('forgotPassword.sendCodeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      Alert.alert(t('common.error'), t('forgotPassword.enterResetCode'));
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordMin8'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email.trim(), code.trim(), newPassword);
      setStep('done');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('forgotPassword.resetError'));
    } finally {
      setLoading(false);
    }
  };

  // ── Success ──
  if (step === 'done') {
    return (
      <View className="flex-1 bg-surface justify-center items-center px-7">
        <View className="w-[72px] h-[72px] rounded-full bg-nest-500 items-center justify-center mb-6 shadow-lg">
          <Ionicons name="checkmark" size={32} color="#fff" />
        </View>
        <Text className="font-display font-extrabold text-xl text-gray-900 mb-3 text-center">
          {t('forgotPassword.resetSuccess')}
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
          {t('forgotPassword.resetSuccessDesc')}
        </Text>
        <TouchableOpacity
          className="bg-nest-500 rounded-2xl items-center justify-center w-full py-3.5 shadow-lg"
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text className="font-display font-bold text-sm text-white">{t('forgotPassword.goToLogin')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="grow px-7 pt-14 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm border border-gray-100 mb-7"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#111827" />
        </TouchableOpacity>

        {/* Header */}
        <Text className="text-xs text-gray-400 font-medium mb-2">
          {step === 'email' ? t('forgotPassword.recoverAccess') : t('forgotPassword.resetPassword')}
        </Text>
        <Text className="font-display font-extrabold text-xl text-gray-900 mb-2">
          {step === 'email' ? t('forgotPassword.forgotTitle') : t('forgotPassword.enterCode')}
        </Text>
        <Text className="text-sm text-gray-500 mb-7 leading-5">
          {step === 'email'
            ? t('forgotPassword.enterEmailDesc')
            : t('forgotPassword.enterCodeDesc')}
        </Text>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          {step === 'email' ? (
            <>
              <View className="mb-6">
                <Text className="font-display font-bold text-gray-900 mb-2">{t('auth.email')}</Text>
                <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                  <Ionicons name="mail-outline" size={17} color="#9ca3af" />
                  <TextInput
                    className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                    placeholder="you@example.com"
                    placeholderTextColor="#d1d5db"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="go"
                    onSubmitEditing={handleRequestCode}
                  />
                </View>
              </View>
              <TouchableOpacity
                className={`bg-nest-500 rounded-2xl items-center justify-center py-3.5 shadow-lg ${loading ? 'opacity-60' : 'opacity-100'}`}
                onPress={handleRequestCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="font-display font-bold text-sm text-white">{t('forgotPassword.sendCode')}</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Reset code */}
              <View className="mb-5">
                <Text className="font-display font-bold text-gray-900 mb-2">{t('forgotPassword.resetCode')}</Text>
                <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                  <Ionicons name="key-outline" size={17} color="#9ca3af" />
                  <TextInput
                    className="flex-1 text-gray-700 text-center text-xl font-bold tracking-[4px] ml-3"
                    placeholder="– – – – – –"
                    placeholderTextColor="#d1d5db"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="next"
                    onSubmitEditing={() => newPasswordRef.current?.focus()}
                  />
                </View>
              </View>

              {/* New password */}
              <View className="mb-5">
                <Text className="font-display font-bold text-gray-900 mb-2">{t('forgotPassword.newPassword')}</Text>
                <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                  <Ionicons name="lock-closed-outline" size={17} color="#9ca3af" />
                  <TextInput
                    ref={newPasswordRef}
                    className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                    placeholder={t('auth.min8Chars')}
                    placeholderTextColor="#d1d5db"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={secureText}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setSecureText(!secureText)} className="p-1">
                    <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm password */}
              <View className="mb-7">
                <Text className="font-display font-bold text-gray-900 mb-2">{t('auth.confirmPassword')}</Text>
                <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                  <Ionicons name="lock-closed-outline" size={17} color="#9ca3af" />
                  <TextInput
                    ref={confirmRef}
                    className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                    placeholder={t('auth.reenterPassword')}
                    placeholderTextColor="#d1d5db"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={secureConfirm}
                    returnKeyType="go"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)} className="p-1">
                    <Ionicons name={secureConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className={`bg-nest-500 rounded-2xl items-center justify-center py-3.5 shadow-lg ${loading ? 'opacity-60' : 'opacity-100'}`}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="font-display font-bold text-sm text-white">{t('forgotPassword.resetPasswordBtn')}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity className="items-center mt-4 py-2" onPress={() => setStep('email')}>
                <Text className="text-sm font-bold text-nest-500">{t('forgotPassword.noCode')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
