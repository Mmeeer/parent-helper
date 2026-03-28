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
} from 'react-native';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddChild'>;
};

export default function AddChildScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const ageNum = parseInt(age, 10);
    if (!name.trim()) {
      Alert.alert('Error', "Please enter the child's name.");
      return;
    }
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 18) {
      Alert.alert('Error', 'Please enter a valid age (1-18).');
      return;
    }

    setLoading(true);
    try {
      await api.createChild(name.trim(), ageNum);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create child profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface-secondary"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="p-6">
        <Text className="text-xl font-bold mb-6 text-slate-800">
          Add Child Profile
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-slate-700 mb-1.5">Child's Name</Text>
          <TextInput
            placeholder="Enter name"
            value={name}
            onChangeText={setName}
            autoFocus
            className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-800"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View className="mb-8">
          <Text className="text-sm font-semibold text-slate-700 mb-1.5">Age</Text>
          <TextInput
            placeholder="Enter age (1-18)"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={2}
            className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-800"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading}
          className={`bg-primary-600 rounded-xl py-3.5 items-center ${loading ? 'opacity-60' : ''}`}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-lg">Add Child</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
