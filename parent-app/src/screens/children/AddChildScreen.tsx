import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { C, CARD, LABEL } from '../../theme';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'AddChild'>;
};

export default function AddChildScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const ageNum = Number.parseInt(age, 10);
    if (!name.trim()) {
      Alert.alert('Алдаа', 'Хүүхдийн нэрийг оруулна уу.');
      return;
    }
    if (!age || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 18) {
      Alert.alert('Алдаа', 'Зөв нас оруулна уу (1-18).');
      return;
    }

    setLoading(true);
    try {
      await api.createChild(name.trim(), ageNum);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Хүүхдийн профайл үүсгэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Page header */}
        <View className="mt-6 mb-7">
          <Text style={[LABEL, { marginBottom: 6 }]}>ПРОФАЙЛ</Text>
          <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>
            Хүүхэд нэмэх
          </Text>
        </View>

        {/* Form card */}
        <View style={{ ...CARD, padding: 20 }}>
          <View className="mb-5">
            <Text style={[LABEL, { marginBottom: 6 }]}>ХҮҮХДИЙН НЭР</Text>
            <TextInput
              placeholder="Нэр оруулах"
              value={name}
              onChangeText={setName}
              autoFocus
              style={{
                backgroundColor: C.bg,
                borderWidth: 1,
                borderColor: C.ink200,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                color: C.ink900,
              }}
              placeholderTextColor={C.ink300}
            />
          </View>

          <View>
            <Text style={[LABEL, { marginBottom: 6 }]}>НАС</Text>
            <TextInput
              placeholder="Нас оруулах (1-18)"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={2}
              style={{
                backgroundColor: C.bg,
                borderWidth: 1,
                borderColor: C.ink200,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 14,
                color: C.ink900,
              }}
              placeholderTextColor={C.ink300}
            />
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          className="bg-ink-900 rounded-xl items-center justify-center mt-6"
          style={{ height: 52, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
              Хүүхэд нэмэх
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
