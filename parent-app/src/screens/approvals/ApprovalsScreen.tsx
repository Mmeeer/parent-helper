import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Alert, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatTimeAgo } from '../../utils/formatters';
import * as api from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../theme';
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
      Alert.alert('Алдаа', error.message || 'Зөвшөөрлийг боловсруулахад алдаа гарлаа.');
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
      <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-3">
        <View className="flex-row items-start gap-4 mb-5">
          {/* App icon */}
          <View className="w-12 h-12 rounded-2xl bg-nest-100 items-center justify-center shrink-0 shadow-md">
            <Text className="text-xl">📱</Text>
          </View>

          <View className="flex-1">
            <Text className="font-bold text-gray-900" numberOfLines={1}>
              {appName}
            </Text>
            {packageName && packageName !== appName && (
              <Text className="text-[10px] text-gray-400 mt-0.5" numberOfLines={1}>
                {packageName}
              </Text>
            )}
            <Text className="text-xs text-gray-400 mt-0.5">
              <Text className="font-bold text-gray-600">{item.data?.childName as string || ''}</Text>
              {item.data?.childName ? ' · ' : ''}{formatTimeAgo(item.createdAt)}
            </Text>
          </View>

          {hasRatingBadge && (
            <View className="bg-warm-50 px-2 py-1 rounded-lg shrink-0">
              <Text className="text-[10px] font-bold text-warm-600">{ageRating}</Text>
            </View>
          )}
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleDecision(item._id, 'approve')}
            disabled={isProcessing}
            className={`flex-1 bg-safe-500 rounded-2xl items-center justify-center shadow-md py-[13px] ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
          >
            {isProcessing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text className="text-sm font-display font-bold text-white">Зөвшөөрөх</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDecision(item._id, 'block')}
            disabled={isProcessing}
            className={`flex-1 bg-gray-100 rounded-2xl items-center justify-center py-[13px] ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
          >
            <Text className="text-sm font-display font-bold text-gray-600">Хаах</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={C.gray900} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: top * 2 }}>
      <FlatList
        data={approvals}
        renderItem={renderApproval}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-7 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadApprovals(); }}
            tintColor={C.gray900}
          />
        }
        ListHeaderComponent={
          <View className="mt-6 mb-7">
            <Text className="font-display font-extrabold text-xl text-gray-900">Зөвшөөрлүүд</Text>
            <Text className="text-sm text-gray-400 mt-1">App install requests from your children</Text>
            {approvals.length > 0 && (
              <Text className="text-xs text-gray-400 font-bold mt-5 tracking-wide">
                PENDING ({approvals.length})
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center pt-[60px] px-10">
            <View className="w-16 h-16 rounded-full bg-safe-50 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle-outline" size={32} color={C.safe500} />
            </View>
            <Text className="text-sm font-bold text-gray-600">Цэвэр</Text>
            <Text className="text-sm text-gray-400 text-center mt-1.5 leading-5">
              Хүлээгдэж буй апп зөвшөөрөл байхгүй.
            </Text>
          </View>
        }
      />
    </View>
  );
}
