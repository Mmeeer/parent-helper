import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, Alert, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatTimeAgo } from '../../utils/formatters';
import * as api from '../../services/api';
import type { Alert as AlertType } from '../../types';

export default function ApprovalsScreen() {
  const [approvals, setApprovals] = useState<AlertType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      const data = await api.getPendingApprovals();
      setApprovals(data);
    } catch {
      // Handle silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApprovals();
    }, [loadApprovals]),
  );

  const handleDecision = async (approvalId: string, action: 'approve' | 'block') => {
    setProcessingId(approvalId);
    try {
      await api.decideApproval(approvalId, action);
      setApprovals((prev) => prev.filter((a) => a._id !== approvalId));
      Alert.alert(
        'Done',
        action === 'approve' ? 'App has been approved.' : 'App has been blocked.',
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process approval.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderApproval = ({ item }: { item: AlertType }) => {
    const isProcessing = processingId === item._id;
    const appName = (item.data?.appName as string) || (item.data?.target as string) || 'Unknown App';
    const packageName = item.data?.packageName as string | undefined;

    return (
      <View className="rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <View className="flex-row items-center mb-3">
          <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
            <Ionicons name="download-outline" size={24} color="#4F46E5" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
              {appName}
            </Text>
            {packageName && packageName !== appName && (
              <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>{packageName}</Text>
            )}
            <Text className="text-[11px] text-slate-400 mt-0.5">{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        <Text className="text-sm text-slate-500 leading-5 mb-3.5">
          A new app was installed on your child's device. Would you like to allow or block it?
        </Text>

        <View className="flex-row gap-2.5">
          <TouchableOpacity
            onPress={() => handleDecision(item._id, 'block')}
            disabled={isProcessing}
            className="flex-1 bg-danger-600 rounded-xl py-3 items-center justify-center flex-row gap-2"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="ban" size={16} color="#FFFFFF" />
                <Text className="text-white font-bold">Block</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDecision(item._id, 'approve')}
            disabled={isProcessing}
            className="flex-1 bg-accent-600 rounded-xl py-3 items-center justify-center flex-row gap-2"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text className="text-white font-bold">Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-secondary">
      <FlatList
        data={approvals}
        renderItem={renderApproval}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadApprovals();
            }}
          />
        }
        ListEmptyComponent={
          <View className="items-center pt-20 px-10">
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#94A3B8" />
            <Text className="text-lg font-bold text-slate-800 mt-4">
              All Clear
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-2">
              No pending app approvals.
            </Text>
          </View>
        }
      />
    </View>
  );
}
