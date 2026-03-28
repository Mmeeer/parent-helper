import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

type Step = 'email' | 'code' | 'done';

export default function ForgotPasswordScreen({ navigation }: Props) {
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
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setStep('code');
      Alert.alert('Check Your Email', 'If that email is registered, a reset code has been sent.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the reset code.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email.trim(), code.trim(), newPassword);
      setStep('done');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──
  if (step === 'done') {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center px-10">
        <View className="w-[88px] h-[88px] rounded-full bg-emerald-100 items-center justify-center mb-6">
          <Ionicons name="checkmark-circle" size={56} color="#34D399" />
        </View>
        <Text className="text-2xl font-bold text-slate-800 mb-3">
          Password Reset!
        </Text>
        <Text className="text-[15px] text-slate-500 text-center leading-[22px] mb-8">
          Your password has been updated. Please log in with your new password.
        </Text>
        <TouchableOpacity
          className="bg-primary-600 rounded-2xl h-[52px] items-center justify-center w-full"
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text className="text-white text-base font-bold tracking-wide">
            Go to Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: 56, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="px-6"
      >
        {/* Back button */}
        <TouchableOpacity
          className="w-[42px] h-[42px] rounded-xl bg-white items-center justify-center mb-6 shadow-sm shadow-black/5"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>

        {/* Header */}
        <Text className="text-[26px] font-bold text-slate-800 mb-2">
          Reset Password
        </Text>
        <Text className="text-[15px] text-slate-500 leading-[22px] mb-7">
          {step === 'email'
            ? "Enter your email and we'll send you a reset code."
            : 'Enter the code from your email and set a new password.'}
        </Text>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-6 shadow-sm shadow-black/5">
          {step === 'email' ? (
            <>
              <View className="mb-5">
                <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
                  Email
                </Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                  <TextInput
                    className="flex-1 ml-3 text-[15px] text-slate-800"
                    placeholder="you@example.com"
                    placeholderTextColor="#94A3B8"
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
                className={`bg-primary-600 rounded-2xl h-[52px] items-center justify-center ${loading ? 'opacity-70' : ''}`}
                onPress={handleRequestCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-bold tracking-wide">
                    Send Reset Code
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Reset code */}
              <View className="mb-5">
                <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
                  Reset Code
                </Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
                  <Ionicons name="key-outline" size={18} color="#94A3B8" />
                  <TextInput
                    className="flex-1 ml-3 text-[20px] font-bold text-slate-800 tracking-[4px]"
                    placeholder="– – – – – –"
                    placeholderTextColor="#94A3B8"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                    returnKeyType="next"
                    onSubmitEditing={() => newPasswordRef.current?.focus()}
                  />
                </View>
              </View>

              {/* New password */}
              <View className="mb-5">
                <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
                  New Password
                </Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                  <TextInput
                    ref={newPasswordRef}
                    className="flex-1 ml-3 text-[15px] text-slate-800"
                    placeholder="Min. 8 characters"
                    placeholderTextColor="#94A3B8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={secureText}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setSecureText(!secureText)} className="p-1">
                    <Ionicons
                      name={secureText ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm password */}
              <View className="mb-6">
                <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
                  Confirm Password
                </Text>
                <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                  <TextInput
                    ref={confirmRef}
                    className="flex-1 ml-3 text-[15px] text-slate-800"
                    placeholder="Re-enter password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={secureConfirm}
                    returnKeyType="go"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)} className="p-1">
                    <Ionicons
                      name={secureConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className={`bg-primary-600 rounded-2xl h-[52px] items-center justify-center ${loading ? 'opacity-70' : ''}`}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-base font-bold tracking-wide">
                    Reset Password
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity className="items-center mt-4 py-2" onPress={() => setStep('email')}>
                <Text className="text-sm font-semibold text-primary-600">
                  Didn't receive a code? Try again
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
