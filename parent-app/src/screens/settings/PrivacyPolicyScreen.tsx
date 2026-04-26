import React from 'react';
import { View, Text, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();

  const SECTIONS = [
    {
      title: t('privacy.dataCollection'),
      icon: 'document-text-outline' as const,
      content: t('privacy.dataCollectionDesc'),
    },
    {
      title: t('privacy.dataUsage'),
      icon: 'shield-checkmark-outline' as const,
      content: t('privacy.dataUsageDesc'),
    },
    {
      title: t('privacy.dataStorage'),
      icon: 'server-outline' as const,
      content: t('privacy.dataStorageDesc'),
    },
    {
      title: t('privacy.childPrivacy'),
      icon: 'people-outline' as const,
      content: t('privacy.childPrivacyDesc'),
    },
    {
      title: t('privacy.yourRights'),
      icon: 'key-outline' as const,
      content: t('privacy.yourRightsDesc'),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-surface" showsVerticalScrollIndicator={false}>
      <View className="px-6 pt-6 pb-10">
        {/* Header */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-xl bg-nest-50 items-center justify-center mr-3">
              <Ionicons name="shield-outline" size={22} color={C.nest500} />
            </View>
            <View>
              <Text className="font-display font-bold text-lg text-gray-900">{t('privacy.title')}</Text>
              <Text className="text-xs text-gray-400">{t('privacy.lastUpdated')}</Text>
            </View>
          </View>
          <Text className="text-sm text-gray-500 leading-5">
            {t('privacy.intro')}
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, index) => (
          <View key={index} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4">
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
                <Ionicons name={section.icon} size={16} color={C.gray500} />
              </View>
              <Text className="font-display font-bold text-sm text-gray-900">{section.title}</Text>
            </View>
            <Text className="text-sm text-gray-500 leading-5">{section.content}</Text>
          </View>
        ))}

        {/* Terms of Service */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
              <Ionicons name="document-outline" size={16} color={C.gray500} />
            </View>
            <Text className="font-display font-bold text-sm text-gray-900">{t('privacy.termsOfService')}</Text>
          </View>
          <Text className="text-sm text-gray-500 leading-5">
            {t('privacy.termsOfServiceDesc')}
          </Text>
        </View>

        {/* Contact */}
        <TouchableOpacity
          onPress={() => Linking.openURL('mailto:support@primekids.mn')}
          className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-lg bg-nest-50 items-center justify-center mr-3">
              <Ionicons name="mail-outline" size={16} color={C.nest500} />
            </View>
            <View className="flex-1">
              <Text className="font-display font-bold text-sm text-gray-900">{t('privacy.contact')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">support@primekids.mn</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.gray300} />
          </View>
        </TouchableOpacity>

        <Text className="text-xs text-gray-400 font-bold text-center mt-6">
          Prime Kids: Parent Helper v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
