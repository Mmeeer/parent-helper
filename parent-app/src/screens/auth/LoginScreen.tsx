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
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.enterEmail'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert(t('auth.loginFailed'), error.message || t('auth.invalidCredentials'));
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
        contentContainerClassName="grow justify-center px-7"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View className="items-center mb-8">
          <Image
            source={require('../../../assets/branding/logo-mark.png')}
            style={{ width: 88, height: 88, marginBottom: 14 }}
            resizeMode="contain"
          />
          <Text className="font-display font-extrabold text-xl text-gray-900 tracking-tight">
            Prime Kids: Parent Helper
          </Text>
          <Text className="text-xs text-gray-400 font-medium mt-1">
            {t('auth.familyProtection')}
          </Text>
        </View>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          {/* Email */}
          <View className="mb-5">
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-3">
            <Text className="font-display font-bold text-gray-900 mb-2">{t('auth.password')}</Text>
            <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
              <Ionicons name="lock-closed-outline" size={17} color="#9ca3af" />
              <TextInput
                ref={passwordRef}
                className="flex-1 text-sm font-semibold text-gray-700 ml-3"
                placeholder={t('auth.enterPassword')}
                placeholderTextColor="#d1d5db"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)} className="p-1">
                <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            className="self-end mb-6"
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text className="text-sm font-bold text-nest-500">{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Sign in button */}
          <TouchableOpacity
            className={`bg-nest-500 rounded-2xl items-center justify-center py-3.5 shadow-lg ${loading ? 'opacity-60' : 'opacity-100'}`}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="font-display font-bold text-sm text-white">{t('auth.login')}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sign up */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-sm text-gray-500">{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-sm font-bold text-nest-500">{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
