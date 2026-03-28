import React, { useState, useCallback } from 'react';
import { View, ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, Rules } from '../../types';
import { C, CARD, LABEL } from '../../theme';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'RulesOverview'>;
  readonly route: RouteProp<RootStackParamList, 'RulesOverview'>;
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
        .catch((err: unknown) => showError(err, 'Дүрмийг ачаалахад алдаа гарлаа.'))
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
    if (!dailyLimit) return 'Тохируулаагүй';
    const hours = Math.floor(dailyLimit / 60);
    const mins = dailyLimit % 60;
    const minsPart = mins > 0 ? ` ${mins}м` : '';
    return `${hours}ц${minsPart} өдөрт · ${perAppCount} аппын хязгаар · ${scheduleCount} хуваарь`;
  })();

  const ruleCategories = [
    {
      key: 'screen-time',
      title: 'Дэлгэцийн цагийн хязгаар',
      description: 'Өдрийн хязгаар, аппын хязгаар болон хуваарь тохируулах',
      icon: 'time-outline' as const,
      color: C.amber,
      bgColor: '#FEF3C7',
      summary: screenTimeSummary,
      onPress: () => navigation.navigate('ScreenTimeRules', { childId, childName }),
    },
    {
      key: 'app-rules',
      title: 'Аппын удирдлага',
      description: 'Тодорхой аппыг хаах эсвэл зөвшөөрөх',
      icon: 'apps-outline' as const,
      color: C.ink900,
      bgColor: C.ink100,
      summary: blockedAppsCount > 0
        ? `${blockedAppsCount} апп хаагдсан`
        : 'Хаагдсан апп байхгүй',
      onPress: () => navigation.navigate('AppRules', { childId, childName }),
    },
    {
      key: 'web-filter',
      title: 'Вэб шүүлт',
      description: 'Агуулгын ангилал болон домайны дүрмийг тохируулах',
      icon: 'globe-outline' as const,
      color: C.teal,
      bgColor: '#1A0d9488',
      summary: webCategories > 0 || customBlocked > 0
        ? `${webCategories} ангилал · ${customBlocked} домайн`
        : 'Идэвхтэй шүүлт байхгүй',
      onPress: () => navigation.navigate('WebFilter', { childId, childName }),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      {/* Page header */}
      <View className="mx-5 mt-6 mb-7">
        <Text style={[LABEL, { marginBottom: 6 }]}>ДҮРМҮҮД</Text>
        <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>
          {childName}-ийн дүрмүүд
        </Text>
        <Text className="text-sm text-ink-500 mt-2">
          Эцэг эхийн хяналт болон хязгаарлалтуудыг тохируулах.
        </Text>
      </View>

      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color={C.ink900} />
        </View>
      ) : (
        ruleCategories.map((category) => (
          <Pressable
            key={category.key}
            onPress={category.onPress}
            style={{ ...CARD, marginHorizontal: 16, marginBottom: 12 }}
            className="flex-row items-center px-5 py-4 gap-4"
          >
            <View
              className="w-12 h-12 rounded-2xl justify-center items-center"
              style={{ backgroundColor: category.bgColor, flexShrink: 0 }}
            >
              <Ionicons name={category.icon} size={26} color={category.color} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink-900">
                {category.title}
              </Text>
              <Text className="text-xs text-ink-400 mt-0.5">
                {category.description}
              </Text>
              <Text className="text-[11px] text-ink-500 font-medium mt-1.5">
                {category.summary}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.ink300} />
          </Pressable>
        ))
      )}

      <View className="h-8" />
    </ScrollView>
  );
}
