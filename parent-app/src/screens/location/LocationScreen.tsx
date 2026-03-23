import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Surface, Text, Button, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
import { formatTime } from '../../utils/formatters';
import * as api from '../../services/api';
import { onSocketEvent } from '../../services/socket';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, LocationEntry } from '../../types';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
} catch {
  // react-native-maps not available
}

type Props = {
  route: RouteProp<RootStackParamList, 'LocationMap'>;
};

export default function LocationScreen({ route }: Props) {
  const { childId, childName } = route.params;
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getLocationHistory(childId);
      setLocations(data);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load location data';
      console.error('LocationScreen: Failed to load locations:', msg);
      setError(msg);
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

  const openInExternalMap = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
    }) || `https://maps.google.com/?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary px-10">
        <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
        <Text variant="titleMedium" className="font-semibold text-slate-800 mt-4">
          Error Loading Location
        </Text>
        <Text variant="bodyMedium" className="text-slate-500 text-center mt-2">
          {error}
        </Text>
        <Button
          mode="contained"
          onPress={loadLocations}
          buttonColor={colors.primary}
          textColor={colors.white}
          className="mt-5 rounded-lg"
        >
          Retry
        </Button>
      </View>
    );
  }

  if (!latestLocation) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary px-10">
        <Ionicons name="location-outline" size={64} color={colors.textMuted} />
        <Text variant="titleMedium" className="font-semibold text-slate-800 mt-4">
          No Location Data
        </Text>
        <Text variant="bodyMedium" className="text-slate-500 text-center mt-2">
          Location updates from {childName}'s device will appear here.
          Try sending a Locate command from the Devices screen.
        </Text>
        <Button
          mode="contained"
          onPress={loadLocations}
          buttonColor={colors.primary}
          textColor={colors.white}
          className="mt-5 rounded-lg"
        >
          Refresh
        </Button>
      </View>
    );
  }

  // If MapView is available and hasn't errored, try to render it
  const showMap = MapView && !mapError;

  return (
    <View className="flex-1">
      {showMap ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: latestLocation.lat,
            longitude: latestLocation.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onMapReady={() => console.log('Map ready')}
        >
          {/* Location trail */}
          {locations.length > 1 && (
            <Polyline
              coordinates={locations.map((l: LocationEntry) => ({
                latitude: l.lat,
                longitude: l.lng,
              }))}
              strokeColor={colors.primary}
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
          {locations.slice(0, -1).map((loc: LocationEntry, index: number) => (
            <Marker
              key={index}
              coordinate={{ latitude: loc.lat, longitude: loc.lng }}
              title={formatTime(loc.timestamp)}
              pinColor={colors.textMuted}
              opacity={0.5}
            />
          ))}
        </MapView>
      ) : (
        <ScrollView
          className="flex-1 bg-surface-secondary"
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={loadLocations} />
          }
        >
          <View className="items-center py-10 gap-y-3">
            <Ionicons name="map-outline" size={48} color={colors.textMuted} />
            <Text variant="bodyMedium" className="text-slate-500">
              Map view unavailable
            </Text>
            <Button
              mode="contained"
              icon={() => <Ionicons name="open-outline" size={18} color={colors.white} />}
              onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}
              buttonColor={colors.primary}
              textColor={colors.white}
              className="mt-2 rounded-lg"
            >
              Open in Maps
            </Button>
          </View>

          {/* Location list */}
          {locations.map((loc, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => openInExternalMap(loc.lat, loc.lng)}
            >
              <Surface className="mx-4 mb-2 rounded-xl p-3.5 flex-row items-center gap-x-3" elevation={1}>
                <Ionicons
                  name={index === locations.length - 1 ? 'location' : 'location-outline'}
                  size={20}
                  color={index === locations.length - 1 ? colors.primary : colors.textSecondary}
                />
                <View className="flex-1">
                  <Text variant="bodyMedium" className="font-medium text-slate-800" style={{ fontFamily: 'monospace' }}>
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </Text>
                  <Text variant="labelSmall" className="text-slate-500 mt-0.5">
                    {formatTime(loc.timestamp)}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} />
              </Surface>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Info Panel */}
      <Surface
        className="absolute bottom-5 left-4 right-4 rounded-2xl p-4"
        elevation={3}
      >
        <View className="flex-row items-center gap-x-2 mb-2">
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text variant="titleSmall" className="font-semibold text-slate-800">
            Last Known Location
          </Text>
        </View>
        <TouchableOpacity onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}>
          <Text
            variant="bodySmall"
            className="text-primary-600 underline"
            style={{ fontFamily: 'monospace' }}
          >
            {latestLocation.lat.toFixed(6)}, {latestLocation.lng.toFixed(6)}
          </Text>
        </TouchableOpacity>
        <Text variant="bodySmall" className="text-slate-500 mt-1">
          Updated: {formatTime(latestLocation.timestamp)}
        </Text>
        <Text variant="labelSmall" className="text-slate-400 mt-1">
          {locations.length} location point{locations.length !== 1 ? 's' : ''} today
        </Text>
      </Surface>

      {/* Refresh FAB */}
      <FAB
        icon={() => <Ionicons name="refresh" size={22} color={colors.white} />}
        onPress={loadLocations}
        className="absolute top-4 right-4 bg-primary-600"
        color={colors.white}
        size="small"
      />
    </View>
  );
}
