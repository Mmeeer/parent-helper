import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { colors } from '../../theme';
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
      className="flex-1 bg-surface-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-8">
        {/* Header */}
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center mb-4">
            <Text className="text-white text-2xl font-bold">PH</Text>
          </View>
          <Text
            variant="headlineLarge"
            className="text-primary-600 font-bold text-center"
          >
            Parent Helper
          </Text>
          <Text
            variant="bodyLarge"
            className="text-slate-500 text-center mt-1"
          >
            Sign in to your account
          </Text>
        </View>

        {/* Form */}
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

          <TextInput
            mode="outlined"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secureText}
            autoComplete="password"
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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            buttonColor={colors.primary}
            textColor={colors.white}
            contentStyle={{ paddingVertical: 6 }}
            labelStyle={{ fontSize: 16, fontWeight: '600' }}
            className="mt-2 rounded-xl"
          >
            Sign In
          </Button>
        </View>

        {/* Links */}
        <Pressable
          className="items-center mt-5"
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text
            variant="bodyMedium"
            className="text-primary-600 font-medium"
          >
            Forgot Password?
          </Text>
        </Pressable>

        <Pressable
          className="items-center mt-6"
          onPress={() => navigation.navigate('Register')}
        >
          <Text variant="bodyMedium" className="text-slate-500">
            Don't have an account?{' '}
            <Text className="text-primary-600 font-semibold">Sign Up</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
