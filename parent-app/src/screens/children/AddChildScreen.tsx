import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { colors } from '../../theme';
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
        <Text variant="headlineSmall" className="mb-6 font-bold text-slate-800">
          Add Child Profile
        </Text>

        <TextInput
          mode="outlined"
          label="Child's Name"
          placeholder="Enter name"
          value={name}
          onChangeText={setName}
          autoFocus
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          className="mb-4 bg-white"
        />

        <TextInput
          mode="outlined"
          label="Age"
          placeholder="Enter age (1-18)"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          maxLength={2}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          className="mb-8 bg-white"
        />

        <Button
          mode="contained"
          onPress={handleCreate}
          disabled={loading}
          loading={loading}
          buttonColor={colors.primary}
          textColor="#FFFFFF"
          contentStyle={{ paddingVertical: 6 }}
          className="rounded-xl"
          labelStyle={{ fontSize: 18, fontWeight: '600' }}
        >
          Add Child
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
