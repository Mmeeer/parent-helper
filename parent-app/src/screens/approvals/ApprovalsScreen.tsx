import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
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
    const appTarget = item.data?.target as string | undefined;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.appIcon}>
            <Ionicons name="download-outline" size={24} color={COLORS.info} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.appName} numberOfLines={1}>
              {appTarget || 'Unknown App'}
            </Text>
            <Text style={styles.timestamp}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.message}>{item.message}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.blockButton]}
            onPress={() => handleDecision(item._id, 'block')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="ban" size={18} color={COLORS.white} />
                <Text style={styles.actionTextLight}>Block</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleDecision(item._id, 'approve')}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={COLORS.white} />
                <Text style={styles.actionTextLight}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={approvals}
        renderItem={renderApproval}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApprovals(); }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>All Clear</Text>
            <Text style={styles.emptySubtitle}>
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
