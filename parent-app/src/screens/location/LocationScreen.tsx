import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
import { formatTime } from '../../utils/formatters';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, LocationEntry } from '../../types';

type Props = {
  route: RouteProp<RootStackParamList, 'LocationMap'>;
};

const { width } = Dimensions.get('window');

export default function LocationScreen({ route }: Props) {
  const { childId, childName } = route.params;
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    try {
      const data = await api.getLocationHistory(childId);
      setLocations(data);
    } catch {
      // No location data
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadLocations();
    }, [loadLocations]),
  );

  // Listen for real-time location updates
  useEffect(() => {
    const unsub = onSocketEvent('location:update', (data: any) => {
      if (data?.childId === childId && data?.location) {
        setLocations((prev) => [...prev, data.location]);
      }
    });
    return unsub;
  }, [childId]);

  const latestLocation = locations.length > 0 ? locations[locations.length - 1] : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!latestLocation) {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Location Data</Text>
        <Text style={styles.emptySubtitle}>
          Location updates from {childName}'s device will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: latestLocation.lat,
          longitude: latestLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Location trail */}
        {locations.length > 1 && (
          <Polyline
            coordinates={locations.map((l) => ({
              latitude: l.lat,
              longitude: l.lng,
            }))}
            strokeColor={COLORS.primary}
            strokeWidth={3}
          />
        )}

        {/* Current location marker */}
        <Marker
          coordinate={{
            latitude: latestLocation.lat,
            longitude: latestLocation.lng,
          }}
          title={childName}
          description={`Last updated: ${formatTime(latestLocation.timestamp)}`}
        />

        {/* History markers */}
        {locations.slice(0, -1).map((loc, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            title={formatTime(loc.timestamp)}
            pinColor={COLORS.textLight}
            opacity={0.5}
          />
        ))}
      </MapView>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoPanelHeader}>
          <Ionicons name="location" size={20} color={COLORS.primary} />
          <Text style={styles.infoPanelTitle}>Last Known Location</Text>
        </View>
        <Text style={styles.infoPanelCoords}>
          {latestLocation.lat.toFixed(6)}, {latestLocation.lng.toFixed(6)}
        </Text>
        <Text style={styles.infoPanelTime}>
          Updated: {formatTime(latestLocation.timestamp)}
        </Text>
        <Text style={styles.infoPanelPoints}>
          {locations.length} location point{locations.length !== 1 ? 's' : ''} today
        </Text>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadLocations}>
        <Ionicons name="refresh" size={22} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
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
  map: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoPanelCoords: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  infoPanelTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoPanelPoints: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});
