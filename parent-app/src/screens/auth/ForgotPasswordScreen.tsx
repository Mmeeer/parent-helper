import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
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

  if (step === 'done') {
    return (
      <View className="flex-1 bg-surface-secondary justify-center items-center px-10">
        <View className="w-20 h-20 rounded-full bg-accent-50 items-center justify-center mb-6">
          <Ionicons name="checkmark-circle" size={56} color={colors.secondary} />
        </View>
        <Text
          variant="headlineSmall"
          className="text-slate-700 font-bold text-center mb-3"
        >
          Password Reset!
        </Text>
        <Text
          variant="bodyLarge"
          className="text-slate-500 text-center leading-6 mb-8"
        >
          Your password has been updated. Please log in with your new password.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          buttonColor={colors.primary}
          textColor={colors.white}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
          className="w-full rounded-xl"
        >
          Go to Login
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        className="px-6 pt-14"
      >
        {/* Back button */}
        <IconButton
          icon={() => <Ionicons name="arrow-back" size={22} color={colors.text} />}
          size={22}
          onPress={() => navigation.goBack()}
          mode="contained"
          containerColor={colors.white}
          className="mb-4 self-start rounded-xl"
        />

        {/* Header */}
        <Text
          variant="headlineMedium"
          className="text-slate-700 font-bold mb-2"
        >
          Reset Password
        </Text>
        <Text
          variant="bodyLarge"
          className="text-slate-500 leading-6 mb-8"
        >
          {step === 'email'
            ? "Enter your email address and we'll send you a reset code."
            : 'Enter the code sent to your email and set a new password.'}
        </Text>

        {step === 'email' ? (
          <View className="gap-4">
            <TextInput
              mode="outlined"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              left={<TextInput.Icon icon={() => <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />} />}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              outlineStyle={{ borderRadius: 12 }}
              theme={{ colors: { background: colors.white } }}
            />

            <Button
              mode="contained"
              onPress={handleRequestCode}
              loading={loading}
              disabled={loading}
              buttonColor={colors.primary}
              textColor={colors.white}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              className="mt-4 rounded-xl"
            >
              Send Reset Code
            </Button>
          </View>
        ) : (
          <View className="gap-4">
            <TextInput
              mode="outlined"
              label="Reset Code"
              placeholder="6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              left={<TextInput.Icon icon={() => <Ionicons name="key-outline" size={20} color={colors.textSecondary} />} />}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              outlineStyle={{ borderRadius: 12 }}
              theme={{ colors: { background: colors.white } }}
            />

            <TextInput
              mode="outlined"
              label="New Password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={secureText}
              left={<TextInput.Icon icon={() => <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />} />}
              right={
                <TextInput.Icon
                  icon={() => <Ionicons name={secureText ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />}
                  onPress={() => setSecureText(!secureText)}
                />
              }
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              outlineStyle={{ borderRadius: 12 }}
              theme={{ colors: { background: colors.white } }}
            />

            <TextInput
              mode="outlined"
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={secureConfirm}
              left={<TextInput.Icon icon={() => <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />} />}
              right={
                <TextInput.Icon
                  icon={() => <Ionicons name={secureConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />}
                  onPress={() => setSecureConfirm(!secureConfirm)}
                />
              }
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              outlineStyle={{ borderRadius: 12 }}
              theme={{ colors: { background: colors.white } }}
            />

            <Button
              mode="contained"
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading}
              buttonColor={colors.primary}
              textColor={colors.white}
              contentStyle={{ paddingVertical: 6 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              className="mt-4 rounded-xl"
            >
              Reset Password
            </Button>

            <Pressable
              className="items-center mt-2 py-2"
              onPress={() => setStep('email')}
            >
              <Text
                variant="bodyMedium"
                className="text-primary-600 font-medium"
              >
                Didn't receive a code? Try again
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
