import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import * as api from '../../services/api';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, PairDeviceResponse } from '../../types';

type Props = {
  route: RouteProp<RootStackParamList, 'PairDevice'>;
};

export default function PairDeviceScreen({ route }: Props) {
  const { childId, childName } = route.params;
  const [pairingData, setPairingData] = useState<PairDeviceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const data = await api.pairDevice(childId);
      setPairingData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate pairing code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="phone-portrait-outline" size={72} color={COLORS.primary} />
        <Text style={styles.title}>Pair a Device</Text>
        <Text style={styles.subtitle}>
          Connect a new device for {childName}.
        </Text>

        {pairingData ? (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Pairing Code</Text>
            <Text style={styles.codeValue}>{pairingData.pairingCode}</Text>
            <Text style={styles.codeHint}>
              Enter this code in the Parent Helper app on the child's device.
              The code expires in 10 minutes.
            </Text>

            <TouchableOpacity style={styles.newCodeButton} onPress={handleGenerateCode}>
              <Ionicons name="refresh" size={18} color={COLORS.primary} />
              <Text style={styles.newCodeText}>Generate New Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.steps}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>
                  Install "Parent Helper" app on the child's device
                </Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  Generate a pairing code below
                </Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>
                  Enter the code on the child's device
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.generateButton, loading && styles.generateButtonDisabled]}
              onPress={handleGenerateCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.generateButtonText}>Generate Pairing Code</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 32,
    textAlign: 'center',
  },
  steps: {
    alignSelf: 'stretch',
    gap: 16,
    marginBottom: 32,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '600',
  },
  codeContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  codeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  codeHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  newCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  newCodeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
