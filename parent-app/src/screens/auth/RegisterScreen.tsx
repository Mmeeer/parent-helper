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
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
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
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Could not create account.');
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
        <View className="items-center mb-7">
          <View className="w-[60px] h-[60px] rounded-2xl bg-primary-600 items-center justify-center mb-3.5 shadow-lg shadow-primary-600/30">
            <Ionicons name="person-add" size={28} color="#fff" />
          </View>
          <Text className="text-[26px] font-bold text-slate-800 tracking-tight">
            Create Account
          </Text>
          <Text className="text-[15px] text-slate-500 mt-1">
            Set up your parent account
          </Text>
        </View>

        {/* Form card */}
        <View className="bg-white rounded-3xl p-6 shadow-sm shadow-black/5">
          {/* Name */}
          <View className="mb-5">
            <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
              Full Name
            </Text>
            <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
              <Ionicons name="person-outline" size={18} color="#94A3B8" />
              <TextInput
                className="flex-1 ml-3 text-[15px] text-slate-800"
                placeholder="John Doe"
                placeholderTextColor="#94A3B8"
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
            <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
              Email
            </Text>
            <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
              <Ionicons name="mail-outline" size={18} color="#94A3B8" />
              <TextInput
                ref={emailRef}
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
          <View className="mb-5">
            <Text className="text-xs font-semibold text-slate-500 mb-2 tracking-wide uppercase">
              Password
            </Text>
            <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-4 h-[52px]">
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              <TextInput
                ref={passwordRef}
                className="flex-1 ml-3 text-[15px] text-slate-800"
                placeholder="Min. 8 characters"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                autoComplete="new-password"
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

          {/* Confirm Password */}
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
                onSubmitEditing={handleRegister}
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

          {/* Button */}
          <TouchableOpacity
            className={`bg-primary-600 rounded-2xl h-[52px] items-center justify-center ${loading ? 'opacity-70' : ''}`}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold tracking-wide">
                Create Account
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign in link */}
        <View className="flex-row justify-center mt-7">
          <Text className="text-sm text-slate-500">Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-sm font-bold text-primary-600">Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
