import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, Rules } from '../../types';
import { C } from '../../theme';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'RulesOverview'>;
  readonly route: RouteProp<RootStackParamList, 'RulesOverview'>;
};

export default function RulesOverviewScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.getRules(childId)
        .then(setRules)
        .catch((err: unknown) => showError(err, t('rules.loadError')))
        .finally(() => setLoading(false));
    }, [childId]),
  );

  const dailyLimit = rules?.screenTime?.dailyLimitMin;
  const perAppCount = rules?.screenTime?.perApp?.length || 0;
  const scheduleCount = rules?.screenTime?.schedule?.length || 0;
  const blockedAppsCount = rules?.blockedApps?.length || 0;
  const webCategories = rules?.webFilter?.categories?.length || 0;
  const customBlocked = rules?.webFilter?.customBlock?.length || 0;

  const screenTimeSummary = (() => {
    if (!dailyLimit) return t('rules.notConfigured');
    const hours = Math.floor(dailyLimit / 60);
    const mins = dailyLimit % 60;
    const minsPart = mins > 0 ? ` ${mins}${t('rules.minuteShort')}` : '';
    return `${hours}${t('rules.hourShort')}${minsPart} ${t('rules.perDay')} · ${perAppCount} ${t('rules.appLimits')} · ${scheduleCount} ${t('rules.schedules')}`;
  })();

  const ruleCategories = [
    {
      key: 'screen-time',
      title: t('rules.screenTimeLimit'),
      description: t('rules.screenTimeLimitDesc'),
      icon: 'time-outline' as const,
      color: C.warm500,
      bgColor: C.warm50,
      summary: screenTimeSummary,
      onPress: () => navigation.navigate('ScreenTimeRules', { childId, childName }),
    },
    {
      key: 'app-rules',
      title: t('rules.appManagement'),
      description: t('rules.appManagementDesc'),
      icon: 'apps-outline' as const,
      color: C.nest500,
      bgColor: C.nest50,
      summary: blockedAppsCount > 0
        ? t('rules.appsBlocked', { count: blockedAppsCount })
        : t('rules.noAppsBlocked'),
      onPress: () => navigation.navigate('AppRules', { childId, childName }),
    },
    {
      key: 'web-filter',
      title: t('rules.webFilter'),
      description: t('rules.webFilterDesc'),
      icon: 'globe-outline' as const,
      color: C.safe500,
      bgColor: C.safe50,
      summary: webCategories > 0 || customBlocked > 0
        ? `${webCategories} ${t('rules.categories')} · ${customBlocked} ${t('rules.domains')}`
        : t('rules.noActiveFilters'),
      onPress: () => navigation.navigate('WebFilter', { childId, childName }),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface">
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text className="text-xs text-gray-400 font-bold uppercase mb-1.5">{t('rules.title')}</Text>
        <Text className="font-display text-[32px] font-bold text-gray-900 leading-9">
          {t('rules.childRules', { childName })}
        </Text>
        <Text className="text-sm text-gray-500 mt-2">
          {t('rules.rulesDesc')}
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color={C.nest500} />
        </View>
      ) : (
        ruleCategories.map((category) => (
          <Pressable
            key={category.key}
            onPress={category.onPress}
            className="bg-white rounded-3xl p-5 mx-4 mb-3 flex-row items-center gap-4 border border-gray-100 shadow-sm"
          >
            <View
              className="w-10 h-10 rounded-2xl justify-center items-center shrink-0"
              style={{ backgroundColor: category.bgColor }}
            >
              <Ionicons name={category.icon} size={22} color={category.color} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-display font-bold text-gray-900">
                {category.title}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {category.description}
              </Text>
              <Text className="text-[11px] text-gray-500 font-medium mt-1.5">
                {category.summary}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.gray300} />
          </Pressable>
        ))
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
