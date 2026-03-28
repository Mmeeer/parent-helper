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

  const ruleCategories = [
    {
      title: 'Дэлгэцийн цагийн хязгаар',
      description: 'Өдрийн хязгаар, аппын хязгаар болон хуваарь тохируулах',
      icon: 'time-outline' as const,
      color: '#D97706',
      bgColor: '#D9770620',
      summary: dailyLimit
        ? `${Math.floor(dailyLimit / 60)}ц${dailyLimit % 60 > 0 ? ` ${dailyLimit % 60}м` : ''} өдөрт · ${perAppCount} аппын хязгаар · ${scheduleCount} хуваарь`
        : 'Тохируулаагүй',
      onPress: () => navigation.navigate('ScreenTimeRules', { childId, childName }),
    },
    {
      title: 'Аппын удирдлага',
      description: 'Тодорхой аппыг хаах эсвэл зөвшөөрөх',
      icon: 'apps-outline' as const,
      color: '#4F46E5',
      bgColor: '#4F46E520',
      summary: blockedAppsCount > 0
        ? `${blockedAppsCount} апп хаагдсан`
        : 'Хаагдсан апп байхгүй',
      onPress: () => navigation.navigate('AppRules', { childId, childName }),
    },
    {
      title: 'Вэб шүүлт',
      description: 'Агуулгын ангилал болон домайны дүрмийг тохируулах',
      icon: 'globe-outline' as const,
      color: '#0D9488',
      bgColor: '#0D948820',
      summary: webCategories > 0 || customBlocked > 0
        ? `${webCategories} ангилал · ${customBlocked} домайн`
        : 'Идэвхтэй шүүлт байхгүй',
      onPress: () => navigation.navigate('WebFilter', { childId, childName }),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      <Text className="text-xl font-bold text-slate-800 mx-4 mt-5">
        {childName}-ийн дүрмүүд
      </Text>
      <Text className="text-sm text-slate-500 mx-4 mt-1 mb-5">
        Эцэг эхийн хяналт болон хязгаарлалтуудыг тохируулах.
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
