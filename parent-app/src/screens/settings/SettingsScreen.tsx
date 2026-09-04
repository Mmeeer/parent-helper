import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Alert, Text, Pressable, TouchableOpacity, Modal, TextInput, ActivityIndicator, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as api from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../types';
import { C } from '../../theme';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { isPushRegistrationHealthy } from '../../services/notifications';

type SettingsItem = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  badge?: string;
  onPress: () => void;
};

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [subInfo, setSubInfo] = useState<api.SubscriptionInfo | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pushHealthy, setPushHealthy] = useState(() => isPushRegistrationHealthy());

  useFocusEffect(useCallback(() => {
    api.getSubscription().then((data) => { setSubInfo(data); }).catch(() => { setSubInfo(null); });
  }, []));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setPushHealthy(isPushRegistrationHealthy());
    });
    return () => sub.remove();
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword) {
      Alert.alert(t('common.error'), t('settings.enterPasswordError'));
      return;
    }
    setDeleteLoading(true);
    try {
      await api.deleteAccount(deletePassword, deleteReason || undefined);
      setDeleteModalVisible(false);
      setDeletePassword('');
      setDeleteReason('');
      Alert.alert(
        t('settings.deleteAccountSent'),
        t('settings.deleteAccountSentDesc'),
        [{ text: t('common.understood'), onPress: () => void logout() }],
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('settings.deleteAccountError'));
    } finally {
      setDeleteLoading(false);
    }
  }, [deletePassword, deleteReason, logout]);

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.confirmLogout'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: () => { void logout(); } },
    ]);
  };

  const profileItems: SettingsItem[] = [
    {
      title: t('settings.editProfile'),
      icon: 'person-outline',
      iconBg: 'bg-nest-50',
      iconColor: C.nest500,
      subtitle: t('settings.editProfileSub'),
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      title: t('settings.changePassword'),
      icon: 'lock-closed-outline',
      iconBg: 'bg-warm-50',
      iconColor: C.warm500,
      onPress: () => navigation.navigate('ChangePassword'),
    },
    ...(!!user?.email && !user.emailVerified ? [{
      title: t('settings.verifyEmail'),
      icon: 'mail-outline' as keyof typeof Ionicons.glyphMap,
      iconBg: 'bg-blue-50',
      iconColor: '#3b82f6',
      subtitle: t('settings.verifyEmailSub'),
      onPress: () => navigation.navigate('VerifyEmail'),
    }] : []),
  ];

  const notificationItems: SettingsItem[] = [
    {
      title: t('settings.notificationSettings'),
      icon: 'notifications-outline',
      iconBg: 'bg-warm-50',
      iconColor: C.warm500,
      subtitle: pushHealthy ? t('settings.notificationSettingsSub') : t('settings.pushRegistrationFailed'),
      badge: pushHealthy ? undefined : '!',
      onPress: () => navigation.navigate('NotificationSettings'),
    },
  ];

  const accountItems: SettingsItem[] = [
    {
      title: t('settings.subscription'),
      icon: 'key-outline',
      iconBg: 'bg-purple-50',
      iconColor: '#8b5cf6',
      value: subInfo?.active
        ? t('settings.subscriptionActive', { count: subInfo.subscription?.maxKids })
        : t('settings.subscriptionInactive'),
      valueColor: subInfo?.active ? 'text-safe-600' : 'text-gray-400',
      onPress: () => navigation.navigate('ActivateSubscription'),
    },
  ];

  const supportItems: SettingsItem[] = [
    {
      title: t('settings.privacy'),
      icon: 'document-text-outline',
      iconBg: 'bg-gray-100',
      iconColor: C.gray500,
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
  ];

  const generalItems: SettingsItem[] = [
    {
      title: t('settings.language'),
      icon: 'language-outline',
      iconBg: 'bg-blue-50',
      iconColor: '#3b82f6',
      subtitle: t('settings.languageSub'),
      value: i18n.language === 'mn' ? 'Монгол' : 'English',
      onPress: () => {
        const newLang = i18n.language === 'mn' ? 'en' : 'mn';
        changeLanguage(newLang);
      },
    },
  ];

  const renderSection = (label: string, items: SettingsItem[]) => (
    <View className="mb-6">
      <Text className="text-xs text-gray-400 font-bold px-1 mb-2">{label}</Text>
      <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
        {items.map((item, index) => (
          <Pressable key={item.title} onPress={item.onPress}>
            {({ pressed }) => (
              <View
                className={`p-4 flex-row items-center ${index < items.length - 1 ? 'border-b border-gray-50' : ''}`}
                style={{ opacity: pressed ? 0.7 : 1 }}
              >
                <View className={`w-9 h-9 rounded-xl ${item.iconBg} items-center justify-center mr-3`}>
                  <Ionicons name={item.icon} size={18} color={item.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800">{item.title}</Text>
                  {item.subtitle && (
                    <Text className="text-xs text-gray-400 font-semibold mt-0.5">{item.subtitle}</Text>
                  )}
                </View>
                {item.badge && (
                  <View className="w-5 h-5 rounded-full bg-danger-500 items-center justify-center mr-2">
                    <Text className="text-white text-xs font-bold">{item.badge}</Text>
                  </View>
                )}
                {item.value && (
                  <Text className={`text-xs ${subInfo?.active ? 'font-bold' : 'font-semibold'} ${item.valueColor ?? 'text-gray-400'} mr-2`}>
                    {item.value}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-surface" showsVerticalScrollIndicator={false}>
      <View className="px-6 pb-10" style={{ paddingTop: top + 16 }}>

        {/* Header */}
        <View className="mt-4 mb-6">
          <Text className="font-display font-extrabold text-xl text-gray-900">{t('settings.title')}</Text>
        </View>

        {/* Profile card */}
        <Pressable onPress={() => navigation.navigate('EditProfile')}>
          {({ pressed }) => (
            <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6" style={{ opacity: pressed ? 0.7 : 1 }}>
              <View className="flex-row items-center">
                <View className="w-14 h-14 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: C.nest500 }}>
                  <View className="absolute inset-0 rounded-2xl opacity-30" style={{ backgroundColor: C.nest400, transform: [{ scale: 0.7 }] }} />
                  <Text className="font-display font-bold text-white text-xl">
                    {user?.name?.charAt(0).toUpperCase() ?? 'P'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-display font-bold text-gray-900 text-lg">
                    {user?.name || 'Parent'}
                  </Text>
                  <Text className="text-sm text-gray-400 mt-0.5">
                    {user?.email || ''}
                  </Text>
                  <View className="flex-row items-center mt-1.5">
                    <View className={`w-2 h-2 rounded-full mr-1.5 ${subInfo?.active ? 'bg-safe-400' : 'bg-gray-300'}`} />
                    <Text className={`text-xs font-bold ${subInfo?.active ? 'text-safe-600' : 'text-gray-400'}`}>
                      {subInfo?.active ? t('settings.premiumActive') : t('settings.noPlan')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.gray300} />
              </View>
            </View>
          )}
        </Pressable>

        {/* Settings sections */}
        {renderSection(t('settings.profileSection'), profileItems)}
        {renderSection(t('settings.notificationSection'), notificationItems)}
        {renderSection(t('settings.subscriptionSection'), accountItems)}
        {renderSection(t('settings.helpSection'), supportItems)}
        {renderSection(t('settings.generalSection'), generalItems)}

        {/* Logout button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="w-full py-3.5 bg-danger-50 rounded-2xl items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="font-display font-bold text-sm text-danger-500">
            {t('auth.logout')}
          </Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              t('settings.deleteAccount'),
              t('settings.deleteAccountConfirm'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.continue'), style: 'destructive', onPress: () => setDeleteModalVisible(true) },
              ],
            );
          }}
          className="w-full py-3.5 mt-3 rounded-2xl items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="font-display font-semibold text-xs text-danger-400">
            {t('settings.deleteAccount')}
          </Text>
        </TouchableOpacity>

        {/* Delete Account Modal */}
        <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <View className="w-12 h-12 rounded-2xl bg-danger-50 items-center justify-center self-center mb-4">
                <Ionicons name="warning-outline" size={24} color={C.danger500} />
              </View>
              <Text className="font-display font-bold text-lg text-gray-900 text-center mb-2">
                {t('settings.deleteAccount')}
              </Text>
              <Text className="text-sm text-gray-500 text-center mb-5">
                {t('settings.deleteAccountModal')}
              </Text>
              <View className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 mb-3">
                <TextInput
                  placeholder={t('auth.password')}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  className="text-sm text-gray-900"
                  editable={!deleteLoading}
                />
              </View>
              <View className="bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 mb-4">
                <TextInput
                  placeholder={t('settings.deleteAccountReason')}
                  placeholderTextColor="#9ca3af"
                  value={deleteReason}
                  onChangeText={setDeleteReason}
                  className="text-sm text-gray-900"
                  editable={!deleteLoading}
                  multiline
                  numberOfLines={2}
                  style={{ minHeight: 48, textAlignVertical: 'top' }}
                />
              </View>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
                className="w-full py-3.5 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: deleteLoading || !deletePassword ? '#fca5a5' : C.danger500 }}
                activeOpacity={0.7}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-display font-bold text-sm text-white">
                    {t('settings.deleteAccount')}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); setDeleteReason(''); }}
                className="w-full py-3 rounded-2xl items-center justify-center"
                activeOpacity={0.7}
                disabled={deleteLoading}
              >
                <Text className="font-display font-bold text-sm text-gray-500">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Version */}
        <Text className="text-xs text-gray-400 font-bold text-center mt-8">
          Prime Kids: Parent Helper v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
