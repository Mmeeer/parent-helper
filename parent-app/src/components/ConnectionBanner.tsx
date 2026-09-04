import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSocketStatus, onSocketStatusChange, SocketConnectionStatus } from '../services/socket';
import { C } from '../theme';
import { useTranslation } from 'react-i18next';

/**
 * Shows a small banner when the real-time connection is lost or reconnecting.
 * Hidden when connected.
 */
export default function ConnectionBanner() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SocketConnectionStatus>(getSocketStatus);

  useEffect(() => {
    return onSocketStatusChange(setStatus);
  }, []);

  if (status === 'connected') return null;

  const isConnecting = status === 'connecting';

  return (
    <View
      style={{
        backgroundColor: isConnecting ? C.warm500 : C.danger500,
        paddingVertical: 6,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <Ionicons
        name={isConnecting ? 'sync-outline' : 'cloud-offline-outline'}
        size={14}
        color={C.white}
      />
      <Text style={{ color: C.white, fontSize: 12, fontWeight: '600' }}>
        {isConnecting ? t('common.reconnecting') : t('common.noConnection')}
      </Text>
    </View>
  );
}
