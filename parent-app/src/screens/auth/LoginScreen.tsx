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
import { useAuth } from '../../store/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
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
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="px-6"
      >
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center mb-4 shadow-lg shadow-primary-600/30">
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </View>
          <Text className="text-3xl font-bold text-slate-800 tracking-tight">
            Prime Kids: Parent Helper
          </Text>
          <Text className="text-base text-slate-500 mt-1">
            Sign in to protect your family
          </Text>
        </View>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-6 shadow-sm shadow-black/5">
          {/* Email */}
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-3">
            <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
              Password
            </Text>
            <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              <TextInput
                ref={passwordRef}
                className="flex-1 ml-3 text-[15px] text-slate-800"
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
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

          {/* Forgot password */}
          <TouchableOpacity
            className="self-end mb-6"
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text className="text-sm font-semibold text-primary-600">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Button */}
          <TouchableOpacity
            className={`bg-primary-600 rounded-2xl h-[52px] items-center justify-center ${loading ? 'opacity-70' : ''}`}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold tracking-wide">
                Sign In
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign up link */}
        <View className="flex-row justify-center mt-7">
          <Text className="text-sm text-slate-500">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-sm font-bold text-primary-600">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
