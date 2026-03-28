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
import { C, CARD, SERIF, LABEL } from '../../theme';
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
    const total = (sub.durationMonths || 1) * 30;
    return Math.min(Math.max((total - getDaysLeft()) / total, 0), 1);
  };

  const formatExpiry = (d: string) =>
    new Date(d).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-secondary"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={C.ink900} />}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-7 pb-10" style={{ paddingTop: top * 2 }}>

        {/* ── Header ─────────────────────────────────────── */}
        {isActive ? (
          <View className="mt-6 mb-8 flex-row items-start justify-between">
            <View className="flex-1">
              <Text style={[LABEL, { marginBottom: 6 }]}>Хяналт</Text>
              <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>Өнөөдөр</Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-ink-900 items-center justify-center">
              <Text className="font-serif text-lg text-white" style={{ lineHeight: 22 }}>
                {user?.name?.charAt(0).toUpperCase() ?? 'P'}
              </Text>
            </View>
          </View>
        ) : (
          <View className="mt-6 mb-8">
            <Text style={[LABEL, { marginBottom: 8 }]}>Тавтай морил</Text>
            <Text className="font-serif text-[34px] text-ink-900" style={{ lineHeight: 38 }}>
              Prime Kids: Parent Helper
            </Text>
            <Text className="text-sm text-ink-400 mt-2" style={{ lineHeight: 20 }}>
              Бүлийн аюулгүй хамгаалалт.
            </Text>
          </View>
        )}

        {/* ── Plan Card (active) / Activate Card (inactive) ── */}
        {isActive && sub ? (
          <View className="bg-ink-900 rounded-[20px] p-6 mb-6">
            <Text style={[LABEL, { color: C.ink400, marginBottom: 12 }]}>Төлөвлөгөө</Text>
            <View className="flex-row items-end gap-2 mb-4">
              <Text className="font-serif text-white" style={{ fontSize: 52, lineHeight: 56 }}>
                {getDaysLeft()}
              </Text>
              <Text className="text-sm text-ink-400 mb-1.5">өдөр үлдлээ</Text>
            </View>
            <View className="rounded bg-ink-700 h-1.5 overflow-hidden mb-2">
              <View style={{ backgroundColor: C.teal, height: '100%', width: `${getUsedPct() * 100}%`, borderRadius: 4 }} />
            </View>
            <Text className="text-[10px] text-ink-500 mt-0.5">
              Премиум · {formatExpiry(sub.expiresAt)}
            </Text>
          </View>
        ) : (
          <View style={{ ...CARD, padding: 24, marginBottom: 24 }}>
            <Text style={[LABEL, { marginBottom: 6 }]}>Идэвхжүүлэлт</Text>
            <Text className="font-serif text-[28px] text-ink-900 mb-5" style={{ lineHeight: 32 }}>
              Түлхүүр оруулах
            </Text>
            <Text className="text-sm text-ink-400 mb-5" style={{ lineHeight: 20 }}>
              Администраторын өгсөн захиалгын түлхүүрийг оруулна уу.
            </Text>
            <TextInput
              style={{
                backgroundColor: C.bg, borderWidth: 1, borderColor: C.ink200,
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 16, color: C.ink900, letterSpacing: 2,
                textAlign: 'center', marginBottom: 16,
              }}
              placeholder="PK-XXXX-XXXX"
              placeholderTextColor={C.ink300}
              value={subKey}
              onChangeText={setSubKey}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="bg-ink-900 rounded-xl items-center justify-center"
              style={{ height: 52, opacity: subLoading ? 0.6 : 1 }}
              onPress={handleActivate}
              disabled={subLoading}
              activeOpacity={0.85}
            >
              {subLoading
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>Түлхүүр идэвхжүүлэх</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Tutorial video + steps + messenger (inactive) ─ */}
        {!isActive && (
          <>
            <Text style={[LABEL, { marginBottom: 16 }]}>Заавартилга</Text>

            {/* Video thumbnail */}
            <TouchableOpacity onPress={openTutorialVideo} activeOpacity={0.8} className="mb-5">
              <View style={{
                ...CARD, overflow: 'hidden',
                aspectRatio: 16 / 9,
                backgroundColor: C.ink100,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <View className="w-12 h-12 rounded-full border border-ink-300 items-center justify-center">
                  <Ionicons name="play" size={22} color={C.ink400} style={{ marginLeft: 3 }} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Steps */}
            <View style={{ ...CARD, padding: 20, marginBottom: 16 }}>
              {[
                { n: '01', title: 'Хүүхдийн төхөөрөмжид суулгах', sub: 'Android-д боломжтой' },
                { n: '02', title: 'Хялбар идэвхжүүлэлт', sub: 'Холболтын код оруулах' },
                { n: '03', title: 'Хяналт эхлэх', sub: 'Цаг бодит тайлан' },
              ].map((item, i) => (
                <React.Fragment key={item.n}>
                  {i > 0 && <View className="h-px bg-ink-100 mb-3.5" style={{ marginLeft: 32, marginTop: 14 }} />}
                  <View className="flex-row items-start gap-4">
                    <Text className="text-[11px] text-ink-400 font-semibold mt-1" style={{ width: 20 }}>{item.n}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-ink-800">{item.title}</Text>
                      <Text className="text-xs text-ink-400 mt-1">{item.sub}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Messenger / Support card */}
            <TouchableOpacity onPress={openMessenger} activeOpacity={0.85}>
              <View style={{
                ...CARD, padding: 20,
                flexDirection: 'row', alignItems: 'center', gap: 16,
                backgroundColor: '#f0fdfa',
              }}>
                <View className="w-10 h-10 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(13,148,136,0.1)' }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={C.teal} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-ink-800">Тусламж</Text>
                  <Text className="text-xs text-ink-400 mt-0.5">Messenger-ээр холбогдоо</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.ink300} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* ── Empty children (active, no kids) ────────── */}
        {isActive && children.length === 0 && (
          <>
            <Text style={[LABEL, { marginBottom: 16 }]}>Хүүхэд</Text>
            <View style={{ ...CARD, padding: 32, alignItems: 'center' }}>
              <View className="w-14 h-14 rounded-full bg-ink-100 items-center justify-center mb-4">
                <Ionicons name="people-outline" size={28} color={C.ink400} />
              </View>
              <Text className="text-sm font-semibold text-ink-500 mb-1.5">
                Хүүхэд нэмэгдээгүй байна
              </Text>
              <Text className="text-[13px] text-ink-400 text-center mb-5" style={{ lineHeight: 20 }}>
                Хяналт эхлэхийн тулд хүүхдийн профайл нэмнэ үү.
              </Text>
              <TouchableOpacity
                className="bg-ink-900 rounded-xl px-6 flex-row items-center gap-2"
                style={{ paddingVertical: 12 }}
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
            <Text style={[LABEL, { marginBottom: 16 }]}>Хүүхдүүд</Text>

            {children.map((child, idx) => (
              <Pressable
                key={child._id}
                onPress={() => navigation.navigate('ChildDetail', { childId: child._id, childName: child.name })}
                className="mb-3"
              >
                {({ pressed }) => (
                  <View style={{ ...CARD, padding: 20, opacity: pressed ? 0.85 : 1 }}>
                    <View className="flex-row items-center gap-4">
                      <View style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: idx === 0 ? C.ink900 : C.ink200,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontFamily: SERIF, fontSize: 18, color: idx === 0 ? '#fff' : C.ink600, lineHeight: 20 }}>
                          {child.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-ink-800">{child.name}</Text>
                        <Text className="text-xs text-ink-400 mt-1">{child.age} нас</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <View className="w-2 h-2 rounded-full bg-ink-300" />
                        <Ionicons name="chevron-forward" size={16} color={C.ink300} />
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
                  <View style={{ ...CARD, padding: 20, alignItems: 'center', opacity: pressed ? 0.8 : 1 }}>
                    <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>{alerts.length}</Text>
                    <Text style={[LABEL, { marginTop: 6 }]}>Мэдэгдэл</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                className="flex-1"
                onPress={() => navigation.getParent()?.navigate('Approvals')}
              >
                {({ pressed }) => (
                  <View style={{ ...CARD, padding: 20, alignItems: 'center', opacity: pressed ? 0.8 : 1 }}>
                    <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>{pendingCount}</Text>
                    <Text style={[LABEL, { marginTop: 6 }]}>Хүлээгдэж буй</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {canAddChild && (
              <TouchableOpacity
                style={{ ...CARD, marginTop: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onPress={() => navigation.navigate('AddChild')}
              >
                <Ionicons name="add" size={16} color={C.ink400} />
                <Text className="text-[13px] font-medium text-ink-400">Хүүхэд нэмэх</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
