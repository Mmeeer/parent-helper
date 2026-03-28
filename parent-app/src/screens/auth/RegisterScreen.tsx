import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { C, CARD, LABEL } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

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

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Алдаа', 'Бүх талбарыг бөглөнө үү.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Алдаа', 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Алдаа', 'Нууц үг таарахгүй байна.');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (error: any) {
      Alert.alert('Бүртгэл амжилтгүй', error.message || 'Бүртгэл үүсгэж чадсангүй.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View className="mb-8">
          <Text style={[LABEL, { marginBottom: 8 }]}>Эхлэх</Text>
          <Text className="font-serif text-[36px] text-ink-900" style={{ lineHeight: 40 }}>
            Бүртгэл үүсгэх
          </Text>
          <Text className="text-sm text-ink-400 mt-1.5">
            Эцэг эхийн бүртгэл үүсгэх.
          </Text>
        </View>

        {/* Form card */}
        <View style={{ ...CARD, padding: 24 }}>
          {/* Name */}
          <View className="mb-5">
            <Text style={[LABEL, { marginBottom: 8 }]}>Бүтэн нэр</Text>
            <View style={INPUT}>
              <Ionicons name="person-outline" size={17} color={C.ink400} />
              <TextInput
                className="flex-1 text-base text-ink-900"
                style={{ marginLeft: 12 }}
                placeholder="John Doe"
                placeholderTextColor={C.ink300}
                value={name}
                onChangeText={setName}
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

          {/* Email */}
          <View className="mb-5">
            <Text style={[LABEL, { marginBottom: 8 }]}>Имэйл</Text>
            <View style={INPUT}>
              <Ionicons name="mail-outline" size={17} color={C.ink400} />
              <TextInput
                ref={emailRef}
                className="flex-1 text-base text-ink-900"
                style={{ marginLeft: 12 }}
                placeholder="you@example.com"
                placeholderTextColor={C.ink300}
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
            <Text style={[LABEL, { marginBottom: 8 }]}>Нууц үг</Text>
            <View style={INPUT}>
              <Ionicons name="lock-closed-outline" size={17} color={C.ink400} />
              <TextInput
                ref={passwordRef}
                className="flex-1 text-base text-ink-900"
                style={{ marginLeft: 12 }}
                placeholder="Хамгийн багадаа 8 тэмдэгт"
                placeholderTextColor={C.ink300}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                autoComplete="new-password"
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
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)} className="p-1">
                <Ionicons name={secureConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.ink400} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="bg-ink-900 rounded-xl items-center justify-center"
            style={{ height: 52, opacity: loading ? 0.6 : 1 }}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>Бүртгэл үүсгэх</Text>
            }
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-6">
          <Text className="text-[13px] text-ink-400">Бүртгэл байна уу? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-[13px] font-bold text-ink-900">Нэвтрэх</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
