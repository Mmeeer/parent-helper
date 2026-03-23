import React from 'react';
import { View, ScrollView } from 'react-native';
import { Surface, Text, TouchableRipple } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RulesOverview'>;
  route: RouteProp<RootStackParamList, 'RulesOverview'>;
};

export default function RulesOverviewScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;

  const ruleCategories = [
    {
      title: 'Screen Time Limits',
      description: 'Set daily limits, per-app limits, and schedules',
      icon: 'time-outline' as const,
      color: colors.warning,
      onPress: () => navigation.navigate('ScreenTimeRules', { childId, childName }),
    },
    {
      title: 'App Management',
      description: 'Block or allow specific apps',
      icon: 'apps-outline' as const,
      color: colors.primary,
      onPress: () => navigation.navigate('AppRules', { childId, childName }),
    },
    {
      title: 'Web Filtering',
      description: 'Set content categories and custom domain rules',
      icon: 'globe-outline' as const,
      color: colors.secondary,
      onPress: () => navigation.navigate('WebFilter', { childId, childName }),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      <Text variant="headlineSmall" className="font-bold text-slate-800 mx-4 mt-5">
        Rules for {childName}
      </Text>
      <Text variant="bodyMedium" className="text-slate-500 mx-4 mt-1 mb-5">
        Configure parental controls and restrictions.
      </Text>

      {ruleCategories.map((category, index) => (
        <Surface
          key={index}
          className="mx-4 mb-3 rounded-2xl overflow-hidden"
          elevation={1}
        >
          <TouchableRipple onPress={category.onPress} className="p-4">
            <View className="flex-row items-center">
              <View
                className="w-13 h-13 rounded-2xl justify-center items-center"
                style={{ backgroundColor: category.color + '20' }}
              >
                <Ionicons name={category.icon} size={28} color={category.color} />
              </View>
              <View className="flex-1 ml-3.5">
                <Text variant="titleMedium" className="font-semibold text-slate-800">
                  {category.title}
                </Text>
                <Text variant="bodySmall" className="text-slate-500 mt-0.5">
                  {category.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableRipple>
        </Surface>
      ))}
    </ScrollView>
  );
}
