import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Alert, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatTimeAgo } from '../../utils/formatters';
import * as api from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, CARD, LABEL } from '../../theme';
import type { Alert as AlertType } from '../../types';

const AGE_RATINGS: Record<string, string> = {
  '3+': '3+', '7+': '7+', '12+': '12+', '13+': '13+', '16+': '16+', '17+': '17+', '18+': '18+',
};

export default function ApprovalsScreen() {
  const { top } = useSafeAreaInsets();
  const [approvals, setApprovals] = useState<AlertType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      const data = await api.getPendingApprovals();
      setApprovals(data);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadApprovals(); }, [loadApprovals]));

  const handleDecision = async (approvalId: string, action: 'approve' | 'block') => {
    setProcessingId(approvalId);
    try {
      await api.decideApproval(approvalId, action);
      setApprovals((prev) => prev.filter((a) => a._id !== approvalId));
      Alert.alert('Дууссан', action === 'approve' ? 'Апп зөвшөөрөгдлөө.' : 'Апп хаагдлаа.');
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'Зөвшөөрөлийг боловсруулахад алдаа гарлаа.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderApproval = ({ item }: { item: AlertType }) => {
    const isProcessing = processingId === item._id;
    const appName = (item.data?.appName as string) || (item.data?.target as string) || 'Unknown App';
    const packageName = item.data?.packageName as string | undefined;
    const ageRating = item.data?.ageRating as string | undefined;
    const hasRatingBadge = ageRating && AGE_RATINGS[ageRating];

    return (
      <View style={{ ...CARD, padding: 20, marginBottom: 12 }}>
        <View className="flex-row items-start gap-4 mb-5">
          {/* App icon placeholder */}
          <View className="w-11 h-11 rounded-xl bg-ink-100 items-center justify-center shrink-0">
            <Text className="text-xl">📱</Text>
          </View>

          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink-800" numberOfLines={1}>
              {appName}
            </Text>
            {packageName && packageName !== appName && (
              <Text className="text-[11px] text-ink-400 mt-0.5" numberOfLines={1}>
                {packageName}
              </Text>
            )}
            <Text className="text-[11px] text-ink-400 mt-0.5">
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>

          {hasRatingBadge && (
            <View className="px-2 py-1 rounded-lg shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
              <Text className="text-[10px] font-semibold" style={{ color: C.amber }}>{ageRating}</Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleDecision(item._id, 'approve')}
            disabled={isProcessing}
            className="flex-1 bg-ink-900 rounded-xl items-center justify-center"
            style={{ paddingVertical: 13, opacity: isProcessing ? 0.5 : 1 }}
          >
            {isProcessing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text className="text-sm font-semibold text-white">Зөвшөөрөх</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDecision(item._id, 'block')}
            disabled={isProcessing}
            className="flex-1 border border-ink-200 rounded-xl items-center justify-center"
            style={{ paddingVertical: 13, opacity: isProcessing ? 0.5 : 1 }}
          >
            <Text className="text-sm font-semibold text-ink-500">Хаах</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-secondary" style={{ paddingTop: top * 2 }}>
      <FlatList
        data={approvals}
        renderItem={renderApproval}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadApprovals(); }}
            tintColor={C.ink900}
          />
        }
        ListHeaderComponent={
          <View className="mt-6 mb-7">
            <Text style={[LABEL, { marginBottom: 6 }]}>Хянах</Text>
            <Text className="font-serif text-[32px] text-ink-900" style={{ lineHeight: 36 }}>Зөвшөөрлүүд</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center pt-[60px] px-10">
            <View className="w-16 h-16 rounded-full bg-ink-100 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle-outline" size={32} color={C.ink300} />
            </View>
            <Text className="text-sm font-semibold text-ink-500">Цэвэр</Text>
            <Text className="text-[13px] text-ink-400 text-center mt-1.5" style={{ lineHeight: 20 }}>
              Хүлээгдэж буй апп зөвшөөрөл байхгүй.
            </Text>
          </View>
        }
      />
    </View>
  );
}
