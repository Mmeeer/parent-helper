import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import { C, CARD, LABEL } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

type Step = 'email' | 'code' | 'done';

const INPUT = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: C.bg,
  borderWidth: 1,
  borderColor: C.ink200,
  borderRadius: 12,
  paddingHorizontal: 16,
  height: 52,
};

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
      Alert.alert('Имэйлээ шалгана уу', 'Бүртгэлтэй имэйл бол шинэчлэлийн код илгээгдлээ.');
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Шинэчлэлийн код илгээхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim()) {
      Alert.alert('Алдаа', 'Шинэчлэлийн кодыг оруулна уу.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Алдаа', 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Алдаа', 'Нууц үг таарахгүй байна.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(email.trim(), code.trim(), newPassword);
      setStep('done');
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Нууц үг шинэчлэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success ──
  if (step === 'done') {
    return (
      <View className="flex-1 bg-surface-secondary justify-center items-center px-7">
        <View className="items-center justify-center mb-6" style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.ink100 }}>
          <Ionicons name="checkmark" size={32} color={C.ink900} />
        </View>
        <Text className="font-serif text-[28px] text-ink-900 mb-3 text-center" style={{ lineHeight: 32 }}>
          Нууц үг шинэчлэгдлээ
        </Text>
        <Text className="text-sm text-ink-400 text-center mb-8" style={{ lineHeight: 22 }}>
          Нууц үг амжилттай шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.
        </Text>
        <TouchableOpacity
          className="bg-ink-900 rounded-xl items-center justify-center w-full"
          style={{ height: 52 }}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>Нэвтрэх хуудас руу</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 56, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={{ width: 40, height: 40, borderRadius: 20, ...CARD, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color={C.ink800} />
        </TouchableOpacity>

        {/* Header */}
        <Text style={[LABEL, { marginBottom: 8 }]}>
          {step === 'email' ? 'Хандалт сэргээх' : 'Нууц үг шинэчлэх'}
        </Text>
        <Text className="font-serif text-ink-900 mb-2" style={{ fontSize: 30, lineHeight: 34 }}>
          {step === 'email' ? 'Нууц үг мартсан уу?' : 'Код оруулах'}
        </Text>
        <Text className="text-sm text-ink-400 mb-7" style={{ lineHeight: 20 }}>
          {step === 'email'
            ? 'Имэйл оруулна уу, бид шинэчлэлийн код илгээнэ.'
            : 'Имэйлийн кодыг оруулаад шинэ нууц үг тохируулна уу.'}
        </Text>

        {/* Form card */}
        <View style={{ ...CARD, padding: 24 }}>
          {step === 'email' ? (
            <>
              <View className="mb-6">
                <Text style={[LABEL, { marginBottom: 8 }]}>Имэйл</Text>
                <View style={INPUT}>
                  <Ionicons name="mail-outline" size={17} color={C.ink400} />
                  <TextInput
                    className="flex-1 text-base text-ink-900"
                    style={{ marginLeft: 12 }}
                    placeholder="you@example.com"
                    placeholderTextColor={C.ink300}
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
                className="bg-ink-900 rounded-xl items-center justify-center"
                style={{ height: 52, opacity: loading ? 0.6 : 1 }}
                onPress={handleRequestCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>Шинэчлэлийн код илгээх</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Reset code */}
              <View className="mb-5">
                <Text style={[LABEL, { marginBottom: 8 }]}>Шинэчлэлийн код</Text>
                <View style={INPUT}>
                  <Ionicons name="key-outline" size={17} color={C.ink400} />
                  <TextInput
                    className="flex-1 text-ink-900 text-center"
                    style={{ marginLeft: 12, fontSize: 20, fontWeight: '700', letterSpacing: 4 }}
                    placeholder="– – – – – –"
                    placeholderTextColor={C.ink300}
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
                <Text style={[LABEL, { marginBottom: 8 }]}>Шинэ нууц үг</Text>
                <View style={INPUT}>
                  <Ionicons name="lock-closed-outline" size={17} color={C.ink400} />
                  <TextInput
                    ref={newPasswordRef}
                    className="flex-1 text-base text-ink-900"
                    style={{ marginLeft: 12 }}
                    placeholder="Хамгийн багадаа 8 тэмдэгт"
                    placeholderTextColor={C.ink300}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={secureText}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setSecureText(!secureText)} className="p-1">
                    <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.ink400} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm password */}
              <View className="mb-7">
                <Text style={[LABEL, { marginBottom: 8 }]}>Нууц үг баталгаажуулах</Text>
                <View style={INPUT}>
                  <Ionicons name="lock-closed-outline" size={17} color={C.ink400} />
                  <TextInput
                    ref={confirmRef}
                    className="flex-1 text-base text-ink-900"
                    style={{ marginLeft: 12 }}
                    placeholder="Нууц үгийг дахин оруулах"
                    placeholderTextColor={C.ink300}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={secureConfirm}
                    returnKeyType="go"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)} className="p-1">
                    <Ionicons name={secureConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.ink400} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="bg-ink-900 rounded-xl items-center justify-center"
                style={{ height: 52, opacity: loading ? 0.6 : 1 }}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>Нууц үг шинэчлэх</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity className="items-center mt-4 py-2" onPress={() => setStep('email')}>
                <Text className="text-[13px] font-semibold text-ink-500">Код хүлээж аваагүй юу? Дахин оролдоно уу</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
