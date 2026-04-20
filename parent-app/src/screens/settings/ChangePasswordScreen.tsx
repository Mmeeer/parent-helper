import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import { C } from '../../theme';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const isValid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSave = async () => {
    if (!currentPassword) {
      Alert.alert('Алдаа', 'Одоогийн нууц үгээ оруулна уу.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Алдаа', 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      Alert.alert('Алдаа', 'Нууц үг дор хаяж нэг үсэг, нэг тоо агуулсан байх ёстой.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Алдаа', 'Шинэ нууц үг таарахгүй байна.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert('Амжилттай', 'Нууц үг амжилттай солигдлоо.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Алдаа', err.message || 'Нууц үг солиход алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (t: string) => void,
    placeholder: string,
    secure: boolean,
    showToggle?: boolean,
    onToggle?: () => void,
  ) => (
    <View className="mb-4">
      <Text className="text-xs text-gray-400 font-bold px-1 mb-2">{label}</Text>
      <View className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.gray400}
          secureTextEntry={secure}
          className="flex-1 text-sm text-gray-900 font-semibold"
          editable={!loading}
          autoCapitalize="none"
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.gray400} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface"
    >
      <View className="flex-1 px-6 pt-6">
        {renderField('ОДООГИЙН НУУЦ ҮГ', currentPassword, setCurrentPassword, 'Одоогийн нууц үг', !showCurrent, true, () => setShowCurrent((v) => !v))}
        {renderField('ШИНЭ НУУЦ ҮГ', newPassword, setNewPassword, 'Хамгийн багадаа 8 тэмдэгт', !showNew, true, () => setShowNew((v) => !v))}
        {renderField('ШИНЭ НУУЦ ҮГ ДАВТАХ', confirmPassword, setConfirmPassword, 'Шинэ нууц үг давтах', true)}

        {newPassword.length > 0 && newPassword.length < 8 && (
          <Text className="text-xs text-danger-400 font-semibold px-1 -mt-2 mb-4">
            Хамгийн багадаа 8 тэмдэгт байх ёстой
          </Text>
        )}

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !isValid}
          className="w-full py-3.5 rounded-2xl items-center justify-center mt-4"
          style={{ backgroundColor: loading || !isValid ? C.nest200 : C.nest500 }}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="font-display font-bold text-sm text-white">Нууц үг солих</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
