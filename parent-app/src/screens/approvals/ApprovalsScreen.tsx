import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Surface, Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatTimeAgo } from '../../utils/formatters';
import { colors } from '../../theme';
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
      <Surface elevation={1} className="rounded-2xl p-4">
        <View className="flex-row items-center mb-3">
          <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-3">
            <Ionicons name="download-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.appName} numberOfLines={1}>
              {appName}
            </Text>
            {packageName && packageName !== appName && (
              <Text style={styles.packageName} numberOfLines={1}>{packageName}</Text>
            )}
            <Text style={styles.timestamp}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.message}>
          A new app was installed on your child's device. Would you like to allow or block it?
        </Text>

        <View className="flex-row gap-2.5">
          <Button
            mode="contained"
            onPress={() => handleDecision(item._id, 'block')}
            disabled={isProcessing}
            loading={isProcessing}
            icon={({ size }) => (
              <Ionicons name="ban" size={size - 2} color={colors.white} />
            )}
            buttonColor={colors.danger}
            textColor={colors.white}
            className="flex-1"
            contentStyle={{ paddingVertical: 2 }}
            labelStyle={{ fontSize: 15, fontWeight: '600' }}
          >
            Block
          </Button>

          <Button
            mode="contained"
            onPress={() => handleDecision(item._id, 'approve')}
            disabled={isProcessing}
            loading={isProcessing}
            icon={({ size }) => (
              <Ionicons name="checkmark" size={size - 2} color={colors.white} />
            )}
            buttonColor={colors.secondary}
            textColor={colors.white}
            className="flex-1"
            contentStyle={{ paddingVertical: 2 }}
            labelStyle={{ fontSize: 15, fontWeight: '600' }}
          >
            Approve
          </Button>
        </View>
      </Surface>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.textMuted} />
            <Text variant="titleLarge" className="font-semibold text-slate-800 mt-4">
              All Clear
            </Text>
            <Text variant="bodyMedium" className="text-slate-500 text-center mt-2">
              No pending app approvals.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.info + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  packageName: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  blockButton: {
    backgroundColor: COLORS.danger,
  },
  approveButton: {
    backgroundColor: COLORS.secondary,
  },
  actionTextLight: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
