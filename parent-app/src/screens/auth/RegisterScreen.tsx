import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Pressable, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { colors } from '../../theme';
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
      className="flex-1 bg-surface-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        className="px-8"
      >
        {/* Header */}
        <View className="items-center mb-8 pt-12">
          <View className="w-14 h-14 rounded-2xl bg-primary-600 items-center justify-center mb-4">
            <Text className="text-white text-xl font-bold">PH</Text>
          </View>
          <Text
            variant="headlineMedium"
            className="text-primary-600 font-bold text-center"
          >
            Create Account
          </Text>
          <Text
            variant="bodyLarge"
            className="text-slate-500 text-center mt-1"
          >
            Set up your parent account
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <TextInput
            mode="outlined"
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            left={<TextInput.Icon icon={() => <Ionicons name="person-outline" size={20} color={colors.textSecondary} />} />}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            outlineStyle={{ borderRadius: 12 }}
            theme={{ colors: { background: colors.white } }}
          />

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

          <TextInput
            mode="outlined"
            label="Password"
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secureText}
            autoComplete="new-password"
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
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            buttonColor={colors.primary}
            textColor={colors.white}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontSize: 16, fontWeight: '600' }}
            className="mt-2 rounded-xl"
          >
            Create Account
          </Button>
        </View>

        {/* Link */}
        <Pressable
          className="items-center mt-6 pb-8"
          onPress={() => navigation.goBack()}
        >
          <Text variant="bodyMedium" className="text-slate-500">
            Already have an account?{' '}
            <Text className="text-primary-600 font-semibold">Sign In</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
