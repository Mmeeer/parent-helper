import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordMin8'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), phone.trim());
    } catch (error: any) {
      Alert.alert(t('auth.registerFailed'), error.message || t('auth.registerError'));
    } finally {
      setLoading(false);
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
        <View className="items-center mb-6">
          <Image
            source={require('../../../assets/branding/logo-mark.png')}
            style={{ width: 64, height: 64, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text className="font-display font-extrabold text-xl text-gray-900 tracking-tight">
            {t('auth.createAccount')}
          </Text>
          <Text className="text-xs text-gray-400 font-medium mt-1">
            {t('auth.parentAccount')}
          </Text>
        </View>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          {/* Name */}
          <View className="mb-5">
            <Text className="font-display font-bold text-gray-900 mb-2">{t('auth.fullName')}</Text>
            <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
              <Ionicons name="person-outline" size={17} color="#9ca3af" />
              <TextInput
                className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                placeholder="John Doe"
                placeholderTextColor="#d1d5db"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
          </View>

          {/* Phone */}
          <View className="mb-5">
            <Text className="font-display font-bold text-gray-900 mb-2">{t('auth.phone')}</Text>
            <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
              <Ionicons name="call-outline" size={17} color="#9ca3af" />
              <TextInput
                ref={phoneRef}
                className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                placeholder="+976 9911 2233"
                placeholderTextColor="#d1d5db"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

          {/* Email */}
          <View className="mb-5">
            <Text className="font-display font-bold text-gray-900 mb-2">{t('auth.email')}</Text>
            <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
              <Ionicons name="mail-outline" size={17} color="#9ca3af" />
              <TextInput
                ref={emailRef}
                className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                placeholder="you@example.com"
                placeholderTextColor="#d1d5db"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-5">
            <Text className="font-display font-bold text-gray-900 mb-2">{t('auth.password')}</Text>
            <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
              <Ionicons name="lock-closed-outline" size={17} color="#9ca3af" />
              <TextInput
                ref={passwordRef}
                className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                placeholder={t('auth.min8Chars')}
                placeholderTextColor="#d1d5db"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                autoComplete="new-password"
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
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)} className="p-1">
                <Ionicons name={secureConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className={`bg-nest-500 rounded-2xl items-center justify-center py-3.5 shadow-lg ${loading ? 'opacity-60' : 'opacity-100'}`}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="font-display font-bold text-sm text-white">{t('auth.createAccount')}</Text>
            }
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-6">
          <Text className="text-sm text-gray-500">{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-sm font-bold text-nest-500">{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
