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
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
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

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Алдаа', 'Имэйл болон нууц үгийг оруулна уу.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Нэвтрэх амжилтгүй', error.message || 'Буруу нэвтрэх мэдээлэл.');
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View className="mb-9">
          <Text style={[LABEL, { marginBottom: 8 }]}>Тавтай морил</Text>
          <Text className="font-serif text-[36px] text-ink-900" style={{ lineHeight: 42 }}>
            Prime Kids: Parent Helper
          </Text>
          <Text className="text-sm text-ink-400 mt-1.5" style={{ lineHeight: 20 }}>
            Таны гэр бүлийг хамгаалж байна.
          </Text>
        </View>

        {/* Form card */}
        <View style={{ ...CARD, padding: 24 }}>
          {/* Email */}
          <View className="mb-5">
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-3">
            <Text style={[LABEL, { marginBottom: 8 }]}>Нууц үг</Text>
            <View style={INPUT}>
              <Ionicons name="lock-closed-outline" size={17} color={C.ink400} />
              <TextInput
                ref={passwordRef}
                className="flex-1 text-base text-ink-900"
                style={{ marginLeft: 12 }}
                placeholder="Нууц үгээ оруулна уу"
                placeholderTextColor={C.ink300}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)} className="p-1">
                <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.ink400} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            className="self-end mb-6"
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text className="text-[13px] font-semibold text-ink-500">Нууц үг мартсан уу?</Text>
          </TouchableOpacity>

          {/* Sign in button */}
          <TouchableOpacity
            className="bg-ink-900 rounded-xl items-center justify-center"
            style={{ height: 52, opacity: loading ? 0.6 : 1 }}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>Нэвтрэх</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sign up */}
        <View className="flex-row justify-center mt-6">
          <Text className="text-[13px] text-ink-400">Бүртгэл байхгүй юу? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-[13px] font-bold text-ink-900">Бүртгүүлэх</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
