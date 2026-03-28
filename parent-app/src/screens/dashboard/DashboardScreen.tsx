import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatDuration } from '../../utils/formatters';
import { showError } from '../../utils/showError';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import { useAuth } from '../../store/AuthContext';
import type { DailyBreakdownEntry } from '../../services/api';
import type { Child, ActivitySummary, Alert as AlertType } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

// ── Type scale ────────────────────────────────────────────
// heading:  22px bold    — screen/section titles
// title:    15px semibold — card titles, child names
// body:     14px regular  — descriptions, subtitles
// label:    12px medium   — stat labels, badges, meta
// stat:     18px bold     — stat values in cards
// btn:      14px semibold — all button text

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const SHADOW = {
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
} as const;

const AVATAR_COLORS = ['#4F46E5', '#0D9488', '#D97706', '#7C3AED', '#0369A1'];

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ActivitySummary>>({});
  const [breakdowns, setBreakdowns] = useState<Record<string, DailyBreakdownEntry[]>>({});
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<api.SubscriptionInfo | null>(null);
  const [subKey, setSubKey] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [childrenData, alertsData, subData] = await Promise.all([
        api.getChildren(),
        api.getAlerts(1, 5, true),
        api.getSubscription().catch(() => null),
      ]);
      setChildren(childrenData);
      setAlerts(alertsData.alerts);
      setSubscription(subData);

      if (subData?.active) {
        const summaryMap: Record<string, ActivitySummary> = {};
        const breakdownMap: Record<string, DailyBreakdownEntry[]> = {};
        await Promise.all(
          childrenData.map(async (child) => {
            try {
              const [sum, bd] = await Promise.all([
                api.getActivitySummary(child._id, 'day'),
                api.getDailyBreakdown(child._id, 7),
              ]);
              summaryMap[child._id] = sum;
              breakdownMap[child._id] = bd.breakdown;
            } catch { /* no activity yet */ }
          }),
        );
        setSummaries(summaryMap);
        setBreakdowns(breakdownMap);
      }
    } catch (err) {
      showError(err, 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    const unsub = onSocketEvent('alert:new', () => { loadData(); });
    return unsub;
  }, [loadData]);

  const handleActivate = async () => {
    if (!subKey.trim()) {
      Alert.alert('Error', 'Please enter a subscription key.');
      return;
    }
    setSubLoading(true);
    try {
      await api.activateSubscription(subKey.trim());
      setSubKey('');
      await loadData();
    } catch (error: any) {
      Alert.alert('Activation Failed', error.message || 'Invalid or expired key.');
    } finally {
      setSubLoading(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const isActive = subscription?.active ?? false;
  const sub = subscription?.subscription;
  const canAddChild = isActive && (sub ? sub.currentKids < sub.maxKids : true);

  const formatExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <View className="px-5 pb-10 pt-7" style={{ backgroundColor: '#4F46E5' }}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            {/* label */}
            <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: 4, letterSpacing: 0.4 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
            {/* heading */}
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>
              Welcome, {user?.name?.split(' ')[0] ?? 'there'}
            </Text>
            {/* body */}
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
              {isActive
                ? children.length > 0
                  ? `Monitoring ${children.length} child${children.length > 1 ? 'ren' : ''}`
                  : 'Ready to add your first child'
                : 'Activate a subscription to get started'}
            </Text>
          </View>

          {alerts.length > 0 && (
            <TouchableOpacity
              className="mt-1 w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              onPress={() => navigation.getParent()?.navigate('Alerts')}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              <View className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-400 items-center justify-center">
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{alerts.length}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick stats — only when subscription active */}
        {isActive && sub && (
          <View className="mt-6 flex-row gap-x-3">
            {[
              { value: String(children.length), label: 'Children' },
              { value: String(alerts.length), label: 'Alerts' },
              { value: formatExpiry(sub.expiresAt), label: 'Plan' },
            ].map((item) => (
              <View
                key={item.label}
                className="flex-1 rounded-2xl px-4 py-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
              >
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{item.value}</Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="px-4" style={{ marginTop: -20 }}>

        {/* ── Subscription Card ─────────────────────────── */}
        {isActive && sub ? (
          <View className="rounded-2xl bg-white mb-5" style={SHADOW}>
            <View className="flex-row items-center px-5 py-5 gap-x-4">
              <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              </View>
              <View className="flex-1">
                {/* title */}
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>Subscription Active</Text>
                {/* body */}
                <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                  {sub.currentKids}/{sub.maxKids} children · {formatExpiry(sub.expiresAt)}
                </Text>
              </View>
              <View className="bg-emerald-50 px-2.5 py-1 rounded-full">
                {/* label */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>Active</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl bg-white mb-5" style={SHADOW}>
            <View className="p-5">
              <View className="flex-row items-center gap-x-4 mb-5">
                <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                  <Ionicons name="key-outline" size={18} color="#4F46E5" />
                </View>
                <View className="flex-1">
                  {/* title */}
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>
                    {sub ? 'Subscription Expired' : 'Activate Subscription'}
                  </Text>
                  {/* body */}
                  <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                    Enter your key to unlock all features
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-x-2.5">
                <TextInput
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 h-12"
                  style={{ fontSize: 14, color: '#1E293B' }}
                  placeholder="PH-XXXX-XXXX-XXXX"
                  placeholderTextColor="#94A3B8"
                  value={subKey}
                  onChangeText={setSubKey}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  className="h-11 px-5 bg-primary-600 rounded-xl items-center justify-center"
                  style={subLoading ? { opacity: 0.6 } : {}}
                  onPress={handleActivate}
                  disabled={subLoading}
                >
                  {subLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Activate</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Children Section ─────────────────────────── */}
        {!isActive ? (
          <View className="rounded-2xl bg-white p-8 items-center mb-6" style={SHADOW}>
            <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="lock-closed-outline" size={24} color="#94A3B8" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#475569', textAlign: 'center' }}>
              Children locked
            </Text>
            <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 20 }}>
              Activate a subscription above to add and monitor children
            </Text>
          </View>

        ) : children.length === 0 ? (
          <View className="rounded-2xl bg-white p-8 items-center mb-6" style={SHADOW}>
            <View className="w-14 h-14 rounded-full bg-primary-50 items-center justify-center mb-3">
              <Ionicons name="people-outline" size={24} color="#4F46E5" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B', textAlign: 'center' }}>
              No children yet
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 20, lineHeight: 20 }}>
              Add a child profile to start monitoring their device
            </Text>
            <TouchableOpacity
              className="bg-primary-600 rounded-xl px-6 py-2.5 flex-row items-center gap-x-2"
              onPress={() => navigation.navigate('AddChild')}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Add Child</Text>
            </TouchableOpacity>
          </View>

        ) : (
          <>
            {/* Section header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>Today's Overview</Text>
              {canAddChild && (
                <TouchableOpacity
                  className="flex-row items-center gap-x-1.5 bg-primary-50 px-3 py-1.5 rounded-full"
                  onPress={() => navigation.navigate('AddChild')}
                >
                  <Ionicons name="add" size={14} color="#4F46E5" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#4F46E5' }}>Add Child</Text>
                </TouchableOpacity>
              )}
            </View>

            {children.map((child) => {
              const summary = summaries[child._id];
              const childBreakdown = breakdowns[child._id] || [];
              const avatarBg = AVATAR_COLORS[child.name.codePointAt(0)! % AVATAR_COLORS.length];

              return (
                <Pressable
                  key={child._id}
                  onPress={() => navigation.navigate('ChildDetail', { childId: child._id, childName: child.name })}
                  className="mb-3"
                >
                  {({ pressed }) => (
                    <View
                      className="rounded-2xl bg-white overflow-hidden"
                      style={[SHADOW, pressed ? { opacity: 0.96 } : {}]}
                    >
                      {/* Child header row */}
                      <View className="flex-row items-center px-4 pt-4 pb-3">
                        <View
                          className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
                          style={{ backgroundColor: avatarBg }}
                        >
                          <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>
                            {child.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          {/* title */}
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E293B' }}>{child.name}</Text>
                          {/* label */}
                          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Age {child.age}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      </View>

                      {/* Stats row */}
                      {summary ? (
                        <View className="flex-row border-t border-slate-100">
                          {[
                            { value: formatDuration(summary.totalScreenTimeMin), label: 'Screen Time', color: '#1E293B' },
                            { value: String(summary.topApps.length), label: 'Apps Used', color: '#1E293B' },
                            { value: String(summary.totalBlocked), label: 'Blocked', color: '#E11D48' },
                          ].map((stat, i) => (
                            <React.Fragment key={stat.label}>
                              {i > 0 && <View className="w-px bg-slate-100" />}
                              <View className="flex-1 items-center py-3">
                                <Text style={{ fontSize: 18, fontWeight: '700', color: stat.color }}>{stat.value}</Text>
                                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{stat.label}</Text>
                              </View>
                            </React.Fragment>
                          ))}
                        </View>
                      ) : (
                        <View className="border-t border-slate-100 px-4 py-3">
                          <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>No activity data yet</Text>
                        </View>
                      )}

                      {/* Mini bar chart */}
                      {childBreakdown.length > 0 && (
                        <View className="px-4 pt-3 pb-4 border-t border-slate-100">
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8', letterSpacing: 0.6, marginBottom: 8 }}>
                            THIS WEEK
                          </Text>
                          <View className="flex-row items-end gap-x-1.5">
                            {childBreakdown.map((day, i) => {
                              const maxMin = Math.max(...childBreakdown.map((d) => d.screenTimeMin), 1);
                              const pct = Math.max((day.screenTimeMin / maxMin) * 100, 4);
                              const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(day.date + 'T00:00:00').getDay()];
                              return (
                                <View key={i} className="flex-1 items-center">
                                  <View className="w-full h-10 items-center justify-end">
                                    <View
                                      className="w-full rounded-sm"
                                      style={{
                                        height: `${pct}%`,
                                        backgroundColor: day.screenTimeMin > 180 ? '#FCD34D' : '#C7D2FE',
                                        minHeight: 3,
                                      }}
                                    />
                                  </View>
                                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{dayLabel}</Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
            <View className="h-6" />
          </>
        )}
      </View>
    </ScrollView>
  );
}
