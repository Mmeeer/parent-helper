import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary px-10">
        <Ionicons name="alert-circle-outline" size={64} color="#E11D48" />
        <Text className="text-base font-semibold text-slate-800 mt-4">
          Error Loading Location
        </Text>
        <Text className="text-sm text-slate-500 text-center mt-2">
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadLocations}
          className="mt-5 bg-primary-600 rounded-xl py-3 px-6 items-center"
        >
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!latestLocation) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary px-10">
        <Ionicons name="location-outline" size={64} color="#94A3B8" />
        <Text className="text-base font-semibold text-slate-800 mt-4">
          No Location Data
        </Text>
        <Text className="text-sm text-slate-500 text-center mt-2">
          Location updates from {childName}'s device will appear here.
          Try sending a Locate command from the Devices screen.
        </Text>
        <TouchableOpacity
          onPress={loadLocations}
          className="mt-5 bg-primary-600 rounded-xl py-3 px-6 items-center"
        >
          <Text className="text-white font-bold">Refresh</Text>
        </TouchableOpacity>
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
              strokeColor="#4F46E5"
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
              pinColor="#94A3B8"
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
            <Ionicons name="map-outline" size={48} color="#94A3B8" />
            <Text className="text-sm text-slate-500">
              Map view unavailable
            </Text>
            <TouchableOpacity
              onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}
              className="mt-2 bg-primary-600 rounded-xl py-3 px-6 flex-row items-center gap-2"
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text className="text-white font-bold">Open in Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Location list */}
          {locations.map((loc, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => openInExternalMap(loc.lat, loc.lng)}
            >
              <View className="mx-4 mb-2 rounded-xl p-3.5 flex-row items-center gap-x-3 bg-white shadow-sm shadow-black/5">
                <Ionicons
                  name={index === locations.length - 1 ? 'location' : 'location-outline'}
                  size={20}
                  color={index === locations.length - 1 ? '#4F46E5' : '#64748B'}
                />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-800" style={{ fontFamily: 'monospace' }}>
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    {formatTime(loc.timestamp)}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Info Panel */}
      <View className="absolute bottom-5 left-4 right-4 rounded-2xl p-4 bg-white shadow-sm shadow-black/5">
        <View className="flex-row items-center gap-x-2 mb-2">
          <Ionicons name="location" size={20} color="#4F46E5" />
          <Text className="text-sm font-semibold text-slate-800">
            Last Known Location
          </Text>
        </View>
        <TouchableOpacity onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}>
          <Text
            className="text-xs text-primary-600 underline"
            style={{ fontFamily: 'monospace' }}
          >
            {latestLocation.lat.toFixed(6)}, {latestLocation.lng.toFixed(6)}
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-slate-500 mt-1">
          Updated: {formatTime(latestLocation.timestamp)}
        </Text>
        <Text className="text-[11px] text-slate-400 mt-1">
          {locations.length} location point{locations.length !== 1 ? 's' : ''} today
        </Text>
      </View>

      {/* Refresh FAB */}
      <TouchableOpacity
        onPress={loadLocations}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary-600 items-center justify-center shadow-md"
      >
        <Ionicons name="refresh" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
