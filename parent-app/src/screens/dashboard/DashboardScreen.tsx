import React, { useEffect, useState, useCallback } from 'react';
import {
  View, ScrollView, RefreshControl, Pressable,
  Text, TouchableOpacity, ActivityIndicator, TextInput, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import { useAuth } from '../../store/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../theme';
import type { Child, Alert as AlertType, RootStackParamList } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function HomeScreen({ navigation }: Props) {
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<api.SubscriptionInfo | null>(null);
  const [subKey, setSubKey] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
      setSubscription(subData);
      setPendingCount(approvalsData.length);
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
      Alert.alert('Алдаа', 'Захиалгын түлхүүрийг оруулна уу.');
      return;
    }
    setSubLoading(true);
    try {
      await api.activateSubscription(subKey.trim());
      setSubKey('');
      await loadData();
    } catch (error: any) {
      Alert.alert('Идэвхжүүлэлт амжилтгүй', error.message || 'Буруу эсвэл хугацаа дууссан түлхүүр.');
    } finally {
      setSubLoading(false);
    }
  };

  const openTutorialVideo = () => {
    Linking.openURL('https://www.youtube.com').catch(() => {});
  };

  const openMessenger = () => {
    Linking.openURL('https://m.me/').catch(() => {
      Linking.openURL('https://www.messenger.com').catch(() => {});
    });
  };

  const isActive = subscription?.active ?? false;
  const sub = subscription?.subscription;
  const canAddChild = isActive && (sub ? sub.currentKids < sub.maxKids : true);

  const getDaysLeft = () => {
    if (!sub) return 0;
    return Math.max(0, Math.floor((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000));
  };

  const getUsedPct = () => {
    if (!sub) return 0;
    const total = sub.durationDays || 30;
    return Math.min(Math.max((total - getDaysLeft()) / total, 0), 1);
  };

  const formatExpiry = (d: string) =>
    new Date(d).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric', year: 'numeric' });

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

        {/* ── Header ─────────────────────────────────────── */}
        {isActive ? (
          <View className="mt-6 mb-8 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1.5">Хяналт</Text>
              <Text className="font-display text-[32px] font-extrabold text-gray-900 leading-9">Өнөөдөр</Text>
            </View>
            <View className="w-10 h-10 rounded-full items-center justify-center bg-nest-500">
              <Text className="font-display text-lg font-extrabold text-white leading-[22px]">
                {user?.name?.charAt(0).toUpperCase() ?? 'P'}
              </Text>
            </View>
          </View>
        ) : (
          <View className="mt-6 mb-8">
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-2">Тавтай морил</Text>
            <Text className="font-display text-[34px] font-extrabold text-gray-900 leading-[38px]">
              Prime Kids: Parent Helper
            </Text>
            <Text className="text-sm text-gray-400 mt-2 leading-5">
              Бүлийн аюулгүй хамгаалалт.
            </Text>
          </View>
        )}

        {/* ── Plan Card (active) / Activate Card (inactive) ── */}
        {isActive && sub ? (
          <View className="rounded-3xl p-6 mb-6 bg-nest-600">
            <Text className="text-xs font-bold uppercase tracking-wide mb-3 text-nest-200">Төлөвлөгөө</Text>
            <View className="flex-row items-end gap-2 mb-4">
              <Text className="font-display text-white font-extrabold text-[52px] leading-[56px]">
                {getDaysLeft()}
              </Text>
              <Text className="text-sm mb-1.5 text-nest-200">өдөр үлдлээ</Text>
            </View>
            <View className="rounded h-1.5 overflow-hidden mb-2 bg-nest-500">
              <View style={{ backgroundColor: C.safe400, height: '100%', width: `${getUsedPct() * 100}%`, borderRadius: 4 }} />
            </View>
            <Text className="text-[10px] mt-0.5 text-nest-200">
              Премиум · {formatExpiry(sub.expiresAt)}
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-3xl border border-gray-100 p-6 mb-6">
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1.5">Идэвхжүүлэлт</Text>
            <Text className="font-display text-[28px] font-extrabold text-gray-900 mb-5 leading-8">
              Түлхүүр оруулах
            </Text>
            <Text className="text-sm text-gray-400 mb-5 leading-5">
              Администраторын өгсөн захиалгын түлхүүрийг оруулна уу.
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
                : <Text className="text-sm font-bold text-white tracking-wide">Түлхүүр идэвхжүүлэх</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tutorial video + steps + messenger (inactive) ─ */}
        {!isActive && (
          <>
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-4">Заавартилга</Text>

            {/* Video thumbnail */}
            <TouchableOpacity onPress={openTutorialVideo} activeOpacity={0.8} className="mb-5">
              <View className="bg-white rounded-3xl border border-gray-100 overflow-hidden items-center justify-center aspect-video">
                <View className="w-12 h-12 rounded-full border border-gray-200 items-center justify-center">
                  <Ionicons name="play" size={22} color={C.gray400} style={{ marginLeft: 3 }} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Steps */}
            <View className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
              {[
                { n: '01', title: 'Хүүхдийн төхөөрөмжид суулгах', sub: 'Android-д боломжтой' },
                { n: '02', title: 'Хялбар идэвхжүүлэлт', sub: 'Холболтын код оруулах' },
                { n: '03', title: 'Хяналт эхлэх', sub: 'Цаг бодит тайлан' },
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

            {/* Messenger / Support card */}
            <TouchableOpacity onPress={openMessenger} activeOpacity={0.85}>
              <View className="rounded-3xl border border-gray-100 p-5 flex-row items-center gap-4 bg-nest-50">
                <View className="w-10 h-10 rounded-full items-center justify-center shrink-0 bg-nest-100">
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.nest500} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">Тусламж</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Messenger-ээр холбогдоо</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.gray300} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── Empty children (active, no kids) ────────── */}
        {isActive && children.length === 0 && (
          <>
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-4">Хүүхэд</Text>
            <View className="bg-white rounded-3xl border border-gray-100 p-8 items-center">
              <View className="w-14 h-14 rounded-full items-center justify-center mb-4 bg-nest-50">
                <Ionicons name="people-outline" size={28} color={C.nest500} />
              </View>
              <Text className="text-sm font-semibold text-gray-500 mb-1.5">
                Хүүхэд нэмэгдээгүй байна
              </Text>
              <Text className="text-[13px] text-gray-400 text-center mb-5 leading-5">
                Хяналт эхлэхийн тулд хүүхдийн профайл нэмнэ үү.
              </Text>
              <TouchableOpacity
                className="rounded-2xl px-6 flex-row items-center gap-2 py-3 bg-nest-500"
                onPress={() => navigation.navigate('AddChild')}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-sm font-semibold text-white">Хүүхэд нэмэх</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Children list (active, has kids) ────────── */}
        {isActive && children.length > 0 && (
          <>
            <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-4">Хүүхдүүд</Text>

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
                        <Text className="text-xs text-gray-400 mt-1">{child.age} нас</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <View className="bg-gray-100 px-2.5 py-1 rounded-full flex-row items-center gap-1.5">
                          <View className="w-2 h-2 rounded-full bg-gray-300" />
                          <Text className="text-[10px] text-gray-400 font-semibold">Offline</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={C.gray300} />
                      </View>
                    </View>
                  </View>
                )}
              </Pressable>
            ))}

            <View className="flex-row gap-4 mt-1">
              <Pressable
                className="flex-1"
                onPress={() => navigation.getParent()?.navigate('Alerts')}
              >
                {({ pressed }) => (
                  <View className={`bg-white rounded-2xl border border-gray-100 p-4 items-center ${pressed ? 'opacity-80' : ''}`}>
                    <Text className="font-display text-[32px] font-extrabold text-gray-900 leading-9">{alerts.length}</Text>
                    <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-1.5">Мэдэгдэл</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                className="flex-1"
                onPress={() => navigation.getParent()?.navigate('Approvals')}
              >
                {({ pressed }) => (
                  <View className={`bg-white rounded-2xl border border-gray-100 p-4 items-center ${pressed ? 'opacity-80' : ''}`}>
                    <Text className="font-display text-[32px] font-extrabold text-gray-900 leading-9">{pendingCount}</Text>
                    <Text className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-1.5">Хүлээгдэж буй</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {canAddChild && (
              <TouchableOpacity
                className="bg-white rounded-3xl border border-gray-100 mt-3 p-4 flex-row items-center justify-center gap-2"
                onPress={() => navigation.navigate('AddChild')}
              >
                <Ionicons name="add" size={16} color={C.nest500} />
                <Text className="text-[13px] font-medium text-nest-500">Хүүхэд нэмэх</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
