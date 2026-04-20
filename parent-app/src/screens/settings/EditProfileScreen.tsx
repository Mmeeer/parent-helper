import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import * as api from '../../services/api';
import { C } from '../../theme';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Алдаа', 'Нэрээ оруулна уу.');
      return;
    }
    if (trimmed === user?.name) {
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      await api.updateProfile(trimmed);
      await refreshUser();
      Alert.alert('Амжилттай', 'Профайл шинэчлэгдлээ.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Алдаа', err.message || 'Профайл шинэчлэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface"
    >
      <View className="flex-1 px-6 pt-6">
        {/* Avatar */}
        <View className="items-center mb-8">
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center"
            style={{ backgroundColor: C.nest500 }}
          >
            <Text className="font-display font-bold text-white text-3xl">
              {(name || user?.name || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Name field */}
        <Text className="text-xs text-gray-400 font-bold px-1 mb-2">НЭР</Text>
        <View className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 mb-4">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Нэрээ оруулна уу"
            placeholderTextColor={C.gray400}
            className="text-sm text-gray-900 font-semibold"
            autoFocus
            maxLength={100}
            editable={!loading}
          />
        </View>

        {/* Email (read-only) */}
        <Text className="text-xs text-gray-400 font-bold px-1 mb-2">И-МЭЙЛ</Text>
        <View className="bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-100 mb-8">
          <Text className="text-sm text-gray-400 font-semibold">{user?.email}</Text>
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !name.trim()}
          className="w-full py-3.5 rounded-2xl items-center justify-center"
          style={{ backgroundColor: loading || !name.trim() ? C.nest200 : C.nest500 }}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="font-display font-bold text-sm text-white">Хадгалах</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
