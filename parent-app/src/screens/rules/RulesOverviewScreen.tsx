import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, Rules } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RulesOverview'>;
  route: RouteProp<RootStackParamList, 'RulesOverview'>;
};

export default function RulesOverviewScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;
  const [rules, setRules] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.getRules(childId)
        .then(setRules)
        .catch((err: unknown) => showError(err, 'Failed to load rules.'))
        .finally(() => setLoading(false));
    }, [childId]),
  );

  const dailyLimit = rules?.screenTime?.dailyLimitMin;
  const perAppCount = rules?.screenTime?.perApp?.length || 0;
  const scheduleCount = rules?.screenTime?.schedule?.length || 0;
  const blockedAppsCount = rules?.blockedApps?.length || 0;
  const webCategories = rules?.webFilter?.categories?.length || 0;
  const customBlocked = rules?.webFilter?.customBlock?.length || 0;

  const ruleCategories = [
    {
      title: 'Screen Time Limits',
      description: 'Set daily limits, per-app limits, and schedules',
      icon: 'time-outline' as const,
      color: '#D97706',
      bgColor: '#D9770620',
      summary: dailyLimit
        ? `${Math.floor(dailyLimit / 60)}h${dailyLimit % 60 > 0 ? ` ${dailyLimit % 60}m` : ''} daily · ${perAppCount} app limit${perAppCount !== 1 ? 's' : ''} · ${scheduleCount} schedule${scheduleCount !== 1 ? 's' : ''}`
        : 'Not configured',
      onPress: () => navigation.navigate('ScreenTimeRules', { childId, childName }),
    },
    {
      title: 'App Management',
      description: 'Block or allow specific apps',
      icon: 'apps-outline' as const,
      color: '#4F46E5',
      bgColor: '#4F46E520',
      summary: blockedAppsCount > 0
        ? `${blockedAppsCount} app${blockedAppsCount !== 1 ? 's' : ''} blocked`
        : 'No apps blocked',
      onPress: () => navigation.navigate('AppRules', { childId, childName }),
    },
    {
      title: 'Web Filtering',
      description: 'Set content categories and custom domain rules',
      icon: 'globe-outline' as const,
      color: '#0D9488',
      bgColor: '#0D948820',
      summary: webCategories > 0 || customBlocked > 0
        ? `${webCategories} categor${webCategories !== 1 ? 'ies' : 'y'} · ${customBlocked} custom domain${customBlocked !== 1 ? 's' : ''}`
        : 'No filters active',
      onPress: () => navigation.navigate('WebFilter', { childId, childName }),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      <Text className="text-xl font-bold text-slate-800 mx-4 mt-5">
        Rules for {childName}
      </Text>
      <Text className="text-sm text-slate-500 mx-4 mt-1 mb-5">
        Configure parental controls and restrictions.
      </Text>

      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      ) : (
        ruleCategories.map((category, index) => (
          <View
            key={index}
            className="mx-4 mb-3 rounded-2xl overflow-hidden bg-white shadow-sm shadow-black/5"
          >
            <Pressable onPress={category.onPress} className="p-4">
              <View className="flex-row items-center">
                <View
                  className="w-13 h-13 rounded-2xl justify-center items-center"
                  style={{ backgroundColor: category.bgColor }}
                >
                  <Ionicons name={category.icon} size={28} color={category.color} />
                </View>
                <View className="flex-1 ml-3.5">
                  <Text className="text-base font-semibold text-slate-800">
                    {category.title}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {category.description}
                  </Text>
                  <Text className="text-[11px] text-primary-600 font-medium mt-1.5">
                    {category.summary}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </View>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
