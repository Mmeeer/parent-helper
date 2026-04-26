import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';

export default function EmailVerificationScreen() {
  const { t } = useTranslation();
  const { verifyEmail, resendVerification, logout, user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      Alert.alert(t('common.error'), t('emailVerification.invalidCode'));
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(code.trim());
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('emailVerification.verifyError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerification();
      Alert.alert(t('common.success'), t('emailVerification.resendSuccess'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('emailVerification.resendError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="grow justify-center px-7 py-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-full bg-nest-500/10 items-center justify-center mb-4">
            <Ionicons name="mail-outline" size={32} color="#16a34a" />
          </View>
          <Text className="font-display font-extrabold text-xl text-gray-900 tracking-tight text-center">
            {t('emailVerification.title')}
          </Text>
          <Text className="text-xs text-gray-400 font-medium mt-2 text-center leading-5 px-4">
            {t('emailVerification.codeSent', { email: user?.email })}
          </Text>
        </View>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <View className="mb-6">
            <Text className="font-display font-bold text-gray-900 mb-2 text-center">{t('emailVerification.verificationCode')}</Text>
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
                returnKeyType="go"
                onSubmitEditing={handleVerify}
                autoFocus
              />
            </View>
          </View>

          <TouchableOpacity
            className={`bg-nest-500 rounded-2xl items-center justify-center py-3.5 shadow-lg ${loading ? 'opacity-60' : 'opacity-100'}`}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="font-display font-bold text-sm text-white">{t('emailVerification.verify')}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className={`items-center mt-4 py-2 ${resending ? 'opacity-60' : 'opacity-100'}`}
            onPress={handleResend}
            disabled={resending}
          >
            {resending
              ? <ActivityIndicator size="small" color="#16a34a" />
              : <Text className="text-sm font-bold text-nest-500">{t('emailVerification.resend')}</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="items-center mt-6 py-2" onPress={logout}>
          <Text className="text-sm text-gray-400">{t('auth.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
