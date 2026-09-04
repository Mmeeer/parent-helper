import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
  Modal, Linking, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/AuthContext';
import * as api from '../../services/api';
import { useResendCooldown } from '../../hooks/useResendCooldown';
import LanguageToggle from '../../components/LanguageToggle';
import { TERMS_URL } from '../../utils/constants';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, AppConfig } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

/** Phone rule (matches the backend): 6-20 chars, digits with an optional leading +. */
function isValidPhone(phone: string): boolean {
  return /^\+?\d+$/.test(phone) && phone.length >= 6 && phone.length <= 20;
}

export default function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const cooldown = useResendCooldown(120);

  const otpEnabled = appConfig?.otpEnabled === true;

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Fetch the public app config once so the terms text is ready when tapped.
  // Failure is fine — we fall back to the hosted terms URL.
  useEffect(() => {
    api.getAppConfig().then(setAppConfig).catch(() => {});
  }, []);

  const openTerms = () => {
    if (appConfig?.termsParent) {
      setTermsVisible(true);
    } else {
      Linking.openURL(TERMS_URL).catch(() => {});
    }
  };

  const handleSendOtp = async () => {
    const cleanedPhone = phone.replace(/[\s\-()]/g, '');
    if (!isValidPhone(cleanedPhone)) {
      Alert.alert(t('common.error'), t('register.phoneInvalid'));
      return;
    }
    setOtpSending(true);
    try {
      const res = await api.requestOtp(cleanedPhone, 'register');
      setOtpSent(true);
      cooldown.start();
      // Dev convenience: when SMS isn't configured, the backend returns the code.
      if (res.devCode) setOtpCode(res.devCode);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('forgotPassword.sendCodeError'));
    } finally {
      setOtpSending(false);
    }
  };

  const handleRegister = async () => {
    // Strip common phone formatting before validating/sending.
    const cleanedPhone = phone.replace(/[\s\-()]/g, '');
    if (!name.trim() || !cleanedPhone || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    if (!isValidPhone(cleanedPhone)) {
      Alert.alert(t('common.error'), t('register.phoneInvalid'));
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
    if (!termsAccepted) {
      Alert.alert(t('common.error'), t('register.termsRequired'));
      return;
    }
    if (otpEnabled && otpCode.trim().length !== 6) {
      Alert.alert(t('common.error'), t('emailVerification.invalidCode'));
      return;
    }
    setLoading(true);
    try {
      // With OTP enforced, exchange the SMS code for a one-time token first.
      let otpToken: string | undefined;
      if (otpEnabled) {
        try {
          const res = await api.verifyOtp(cleanedPhone, otpCode.trim(), 'register');
          otpToken = res.otpToken;
        } catch {
          Alert.alert(t('common.error'), t('otp.wrongCode'));
          return;
        }
      }
      await register({
        name: name.trim(),
        phone: cleanedPhone,
        password,
        // Email is optional — only sent when the user filled it in.
        email: email.trim() || undefined,
        acceptedTerms: true,
        otpToken,
      });
    } catch (error: any) {
      if (error instanceof api.ApiError && error.code === 'OTP_REQUIRED') {
        Alert.alert(t('common.error'), t('otp.wrongCode'));
      } else {
        Alert.alert(t('auth.registerFailed'), error.message || t('auth.registerError'));
      }
    } finally {
      setLoading(false);
    }
  };

  /** Checkbox label with the "Terms of Service" words tappable. */
  const renderTermsLabel = () => {
    const label = t('register.acceptTerms');
    const word = t('register.termsWord');
    const idx = label.indexOf(word);
    const link = (
      <Text className="text-nest-500 font-bold" onPress={openTerms}>{word}</Text>
    );
    if (idx < 0) {
      // Translation without the exact terms phrase: make the whole label open the terms.
      return (
        <Text className="flex-1 text-[13px] text-gray-600 leading-5" onPress={openTerms}>{label}</Text>
      );
    }
    return (
      <Text className="flex-1 text-[13px] text-gray-600 leading-5">
        {label.slice(0, idx)}
        {link}
        {label.slice(idx + word.length)}
      </Text>
    );
  };

  const canSubmit = termsAccepted && !loading;

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
        <LanguageToggle />

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

          {/* Phone (required) */}
          <View className="mb-5">
            <Text className="font-display font-bold text-gray-900 mb-2">{t('register.phone')}</Text>
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
            {otpEnabled && (
              <TouchableOpacity
                className="self-end mt-2 py-1 px-1"
                onPress={handleSendOtp}
                disabled={cooldown.active || otpSending}
                hitSlop={8}
              >
                {otpSending
                  ? <ActivityIndicator size="small" color="#9ca3af" />
                  : (
                    <Text className={`text-xs font-bold ${cooldown.active ? 'text-gray-400' : 'text-nest-500'}`}>
                      {cooldown.active ? t('otp.resendIn', { s: cooldown.remaining }) : t('otp.sendCode')}
                    </Text>
                  )}
              </TouchableOpacity>
            )}
          </View>

          {/* SMS verification code (only when OTP is enforced and a code was sent) */}
          {otpEnabled && otpSent && (
            <View className="mb-5">
              <Text className="font-display font-bold text-gray-900 mb-2">{t('otp.codeLabel')}</Text>
              <View className="flex-row items-center px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                <Ionicons name="keypad-outline" size={17} color="#9ca3af" />
                <TextInput
                  className="flex-1 text-gray-700 text-center text-xl font-bold tracking-[4px] ml-3"
                  placeholder="– – – – – –"
                  placeholderTextColor="#d1d5db"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
          )}

          {/* Email (optional) */}
          <View className="mb-5">
            <Text className="font-display font-bold text-gray-900 mb-2">{t('register.emailOptional')}</Text>
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
          <View className="mb-5">
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

          {/* Terms acceptance */}
          <View className="flex-row items-start mb-7">
            <Pressable
              onPress={() => setTermsAccepted((v) => !v)}
              hitSlop={8}
              className={`w-[22px] h-[22px] rounded-md border items-center justify-center mr-3 mt-0.5 ${termsAccepted ? 'bg-nest-500 border-nest-500' : 'bg-gray-50 border-gray-300'}`}
            >
              {termsAccepted && <Ionicons name="checkmark" size={15} color="#fff" />}
            </Pressable>
            {renderTermsLabel()}
          </View>

          <TouchableOpacity
            className={`bg-nest-500 rounded-2xl items-center justify-center py-3.5 shadow-lg ${canSubmit ? 'opacity-100' : 'opacity-60'}`}
            onPress={handleRegister}
            disabled={!canSubmit}
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

      {/* Terms of Service modal */}
      <Modal
        visible={termsVisible}
        animationType="slide"
        onRequestClose={() => setTermsVisible(false)}
      >
        <View className="flex-1 bg-surface" style={{ paddingTop: top, paddingBottom: bottom }}>
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
            <Text className="font-display font-bold text-base text-gray-900">
              {t('register.termsWord')}
            </Text>
            <TouchableOpacity onPress={() => setTermsVisible(false)} className="p-1" hitSlop={8}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 px-5" contentContainerClassName="py-5">
            <Text className="text-[13px] text-gray-700 leading-6">
              {appConfig?.termsParent ?? ''}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
