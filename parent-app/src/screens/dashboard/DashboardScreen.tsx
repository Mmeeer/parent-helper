import React, { useEffect, useState, useCallback } from 'react';
import {
  View, ScrollView, RefreshControl, Pressable, Image,
  Text, TouchableOpacity, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { showError } from '../../utils/showError';
import { isIosOnly } from '../../utils/platform';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import { useAuth } from '../../store/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C } from '../../theme';
import TutorialVideoCard from '../../components/TutorialVideoCard';
import type { Child, Alert as AlertType, DeviceStatus, RootStackParamList, AppConfig } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function HomeScreen({ navigation }: Props) {
  const { top } = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<api.SubscriptionInfo | null>(null);
  const [subKey, setSubKey] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  // "New app installed" approvals are Android-only; hide the card when every device is an iPhone.
  const [iosOnly, setIosOnly] = useState(false);
  // Per-child device list (used for the online/offline pill on each child card).
  const [devicesByChild, setDevicesByChild] = useState<Record<string, DeviceStatus[]>>({});
  // Public app config (tutorial video URL). Fetched once; failure just hides the card.
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    api.getAppConfig().then(setAppConfig).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [childrenData, alertsData, subData, approvalsData] = await Promise.all([
        api.getChildren(),
        api.getAlerts(1, 5, true),
        api.getSubscription().catch(() => null),
        api.getPendingApprovals().catch(() => []),
      ]);
      setChildren(childrenData);
      setAlerts(alertsData.alerts);
      setUnreadTotal(alertsData.total ?? alertsData.alerts.length);
      setSubscription(subData);
      setPendingCount(approvalsData.length);
      const perChild = await Promise.all(
        childrenData.map((c) => api.getChildDevices(c._id).catch(() => [] as DeviceStatus[])),
      );
      const byChild: Record<string, DeviceStatus[]> = {};
      childrenData.forEach((c, i) => { byChild[c._id] = perChild[i]; });
      setDevicesByChild(byChild);
      setIosOnly(isIosOnly(perChild.flat()));
    } catch (err) {
      showError(err, 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    const unsub = onSocketEvent('alert:new', () => loadData());
    return unsub;
  }, [loadData]);

  const handleActivate = async () => {
    if (!subKey.trim()) {
      Alert.alert(t('common.error'), t('dashboard.enterKeyError'));
      return;
    }
    setSubLoading(true);
    try {
      await api.activateSubscription(subKey.trim());
      setSubKey('');
      await loadData();
    } catch (error: any) {
      Alert.alert(t('dashboard.activationFailed'), error.message || t('dashboard.invalidKey'));
    } finally {
      setSubLoading(false);
    }
  };

  const isActive = subscription?.active ?? false;
  const sub = subscription?.subscription;
  const canAddChild = isActive && (sub ? sub.currentKids < sub.maxKids : true);

  const getDaysLeft = () => {
    if (!sub) return 0;
    return Math.max(0, Math.floor((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000));
  };

  /** Fraction of the subscription period already used (bar grows day by day). */
  const getUsedPct = () => {
    if (!sub) return 0;
    const total = sub.durationDays || 365;
    return Math.min(Math.max(1 - getDaysLeft() / total, 0), 1);
  };

  const formatExpiry = (d: string) =>
    new Date(d).toLocaleDateString(i18n.language === 'mn' ? 'mn-MN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  /** Connection pill for a child card: online / offline / not connected. */
  const getChildConnection = (childId: string): { label: string; dotClass: string; textClass: string } => {
    const devices = devicesByChild[childId] ?? [];
    if (devices.length === 0) {
      return { label: t('common.notConnected'), dotClass: 'bg-gray-300', textClass: 'text-gray-400' };
    }
    const online = devices.some((d) => d.status === 'online');
    return online
      ? { label: t('common.online'), dotClass: 'bg-safe-500', textClass: 'text-safe-600' }
      : { label: t('common.offline'), dotClass: 'bg-gray-300', textClass: 'text-gray-400' };
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={C.nest500} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-7 pb-10" style={{ paddingTop: top * 2 }}>

        {/* ── Brand row: logo + slogan ───────────────────── */}
        <View className="flex-row items-center">
          <Image
            source={require('../../../assets/branding/logo-mark.png')}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
          <Text className="ml-2.5 text-[13px] font-semibold text-gray-400">
            {t('auth.familyProtection')}
          </Text>
        </View>

        {/* ── Header ─────────────────────────────────────── */}
        {isActive ? (
          <View className="mt-6 mb-8 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1.5">{t('dashboard.monitoring')}</Text>
              <Text className="font-display text-[32px] font-extrabold text-gray-900 leading-9">{t('dashboard.today')}</Text>
            </View>
            <View className="w-10 h-10 rounded-full items-center justify-center bg-nest-500">
              <Text className="font-display text-lg font-extrabold text-white leading-[22px]">
                {user?.name?.charAt(0).toUpperCase() ?? 'P'}
              </Text>
            </View>
          </View>
        ) : (
          <View className="mt-6 mb-8">
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-2">{t('dashboard.welcome')}</Text>
            <Text className="font-display text-[34px] font-extrabold text-gray-900 leading-[38px]">
              Prime Kids: Parent Helper
            </Text>
            <Text className="text-sm text-gray-400 mt-2 leading-5">
              {t('dashboard.familySafety')}
            </Text>
          </View>
        )}

        {/* ── Plan Card (active) / Activate Card (inactive) ── */}
        {isActive && sub ? (
          <View className="rounded-3xl p-6 mb-6 bg-nest-600">
            <Text className="text-xs font-bold uppercase tracking-wide mb-3 text-nest-200">{t('dashboard.plan')}</Text>
            <View className="flex-row items-end gap-2 mb-4">
              <Text className="font-display text-white font-extrabold text-[52px] leading-[56px]">
                {getDaysLeft()}
              </Text>
              <Text className="text-sm mb-1.5 text-nest-200">{t('dashboard.daysLeft')}</Text>
            </View>
            <View className="rounded h-1.5 overflow-hidden mb-2 bg-nest-500">
              <View style={{ backgroundColor: C.safe400, height: '100%', width: `${getUsedPct() * 100}%`, borderRadius: 4 }} />
            </View>
            <Text className="text-[10px] mt-0.5 text-nest-200">
              {t('dashboard.premium')} · {formatExpiry(sub.expiresAt)}
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-3xl border border-gray-100 p-6 mb-6">
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1.5">{t('dashboard.activation')}</Text>
            <Text className="font-display text-[28px] font-extrabold text-gray-900 mb-5 leading-8">
              {t('dashboard.enterKey')}
            </Text>
            <Text className="text-sm text-gray-400 mb-5 leading-5">
              {t('dashboard.enterKeyDesc')}
            </Text>
            <TextInput
              className="bg-surface rounded-2xl border border-gray-100 px-4 py-3.5 text-base text-gray-900 text-center tracking-widest mb-4"
              placeholder="PK-XXXX-XXXX"
              placeholderTextColor={C.gray300}
              value={subKey}
              onChangeText={setSubKey}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              className={`rounded-2xl items-center justify-center h-[52px] bg-nest-500 ${subLoading ? 'opacity-60' : ''}`}
              onPress={handleActivate}
              disabled={subLoading}
              activeOpacity={0.85}
            >
              {subLoading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-sm font-bold text-white tracking-wide">{t('dashboard.activateKey')}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Setup steps (inactive) ──────────────────── */}
        {!isActive && (
          <>
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-4">{t('dashboard.tutorial')}</Text>

            {/* Steps */}
            <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
              {[
                { n: '01', title: t('dashboard.step01'), sub: t('dashboard.step01Sub') },
                { n: '02', title: t('dashboard.step02'), sub: t('dashboard.step02Sub') },
                { n: '03', title: t('dashboard.step03'), sub: t('dashboard.step03Sub') },
              ].map((item, i) => (
                <React.Fragment key={item.n}>
                  {i > 0 && <View className="h-px bg-gray-100 mb-3.5 ml-8 mt-3.5" />}
                  <View className="flex-row items-start gap-4">
                    <Text className="text-[11px] text-gray-400 font-semibold mt-1 w-5">{item.n}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">{item.title}</Text>
                      <Text className="text-xs text-gray-400 mt-1">{item.sub}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* ── Empty children (active, no kids) ────────── */}
        {isActive && children.length === 0 && (
          <>
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-4">{t('dashboard.children')}</Text>
            <View className="bg-white rounded-3xl border border-gray-100 p-8 items-center">
              <View className="w-14 h-14 rounded-full items-center justify-center mb-4 bg-nest-50">
                <Ionicons name="people-outline" size={28} color={C.nest500} />
              </View>
              <Text className="text-sm font-semibold text-gray-500 mb-1.5">
                {t('dashboard.noChildren')}
              </Text>
              <Text className="text-[13px] text-gray-400 text-center mb-5 leading-5">
                {t('dashboard.noChildrenDesc')}
              </Text>
              <TouchableOpacity
                className="rounded-2xl px-6 flex-row items-center gap-2 py-3 bg-nest-500"
                onPress={() => navigation.navigate('AddChild')}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-sm font-semibold text-white">{t('dashboard.addChild')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Children list (active, has kids) ────────── */}
        {isActive && children.length > 0 && (
          <>
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-4">{t('dashboard.childrenList')}</Text>

            {children.map((child, idx) => (
              <Pressable
                key={child._id}
                onPress={() => navigation.navigate('ChildDetail', { childId: child._id, childName: child.name })}
                className="mb-3"
              >
                {({ pressed }) => (
                  <View className={`bg-white rounded-3xl border border-gray-100 p-4 ${pressed ? 'opacity-85' : ''}`}>
                    <View className="flex-row items-center gap-4">
                      <View className="rounded-2xl items-center justify-center w-11 h-11" style={{
                        backgroundColor: idx % 2 === 0 ? C.nest500 : C.warm500,
                      }}>
                        <Text className="font-display text-lg font-extrabold text-white leading-5">
                          {child.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900">{child.name}</Text>
                        <Text className="text-xs text-gray-400 mt-1">{child.age} {t('common.age')}</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        {(() => {
                          const conn = getChildConnection(child._id);
                          return (
                            <View className="bg-gray-100 px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
                              <View className={`w-2 h-2 rounded-full ${conn.dotClass}`} />
                              <Text className={`text-[10px] font-semibold ${conn.textClass}`}>{conn.label}</Text>
                            </View>
                          );
                        })()}
                        <Ionicons name="chevron-forward" size={16} color={C.gray300} />
                      </View>
                    </View>
                  </View>
                )}
              </Pressable>
            ))}

            {appConfig?.tutorialVideoUrl && (
              <TutorialVideoCard url={appConfig.tutorialVideoUrl} />
            )}

            <View className="flex-row gap-4 mt-1">
              <Pressable
                className="flex-1"
                onPress={() => navigation.getParent()?.navigate('Alerts')}
              >
                {({ pressed }) => (
                  <View className={`bg-white rounded-2xl border border-gray-100 p-4 ${pressed ? 'opacity-80' : ''}`}>
                    <View className="w-8 h-8 rounded-xl bg-danger-50 items-center justify-center mb-2">
                      <Ionicons name="notifications-outline" size={16} color={C.danger500} />
                    </View>
                    <Text className="font-display text-[28px] font-extrabold text-gray-900 leading-8">{unreadTotal > 99 ? '99+' : unreadTotal}</Text>
                    <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1">{t('dashboard.alerts')}</Text>
                  </View>
                )}
              </Pressable>
              {!iosOnly && (
              <Pressable
                className="flex-1"
                onPress={() => navigation.getParent()?.navigate('Approvals')}
              >
                {({ pressed }) => (
                  <View className={`bg-white rounded-2xl border border-gray-100 p-4 ${pressed ? 'opacity-80' : ''}`}>
                    <View className="w-8 h-8 rounded-xl bg-warm-100 items-center justify-center mb-2">
                      <Ionicons name="checkmark-circle-outline" size={16} color={C.warm500} />
                    </View>
                    <Text className="font-display text-[28px] font-extrabold text-gray-900 leading-8">{pendingCount}</Text>
                    <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1">{t('dashboard.pending')}</Text>
                  </View>
                )}
              </Pressable>
              )}
            </View>

            {canAddChild && (
              <TouchableOpacity
                className="bg-white rounded-3xl border border-gray-100 mt-3 p-4 flex-row items-center justify-center gap-2"
                onPress={() => navigation.navigate('AddChild')}
              >
                <Ionicons name="add" size={16} color={C.nest500} />
                <Text className="text-[13px] font-medium text-nest-500">{t('dashboard.addChild')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
