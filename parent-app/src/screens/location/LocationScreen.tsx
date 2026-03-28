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
import { C, CARD } from '../../theme';

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
  readonly route: RouteProp<RootStackParamList, 'LocationMap'>;
};

export default function LocationScreen({ route }: Props) {
  const { childId, childName } = route.params;
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getLocationHistory(childId);
      setLocations(data);
    } catch (err: any) {
      const msg = err?.message || 'Байршлын мэдээлэл ачаалахад алдаа гарлаа';
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

  const latestLocation = locations.length > 0 ? (locations.at(-1) ?? null) : null;

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
        <ActivityIndicator size="large" color={C.ink900} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary px-10">
        <View className="w-16 h-16 rounded-full bg-ink-100 items-center justify-center mb-4">
          <Ionicons name="alert-circle-outline" size={32} color={C.red} />
        </View>
        <Text className="text-sm font-semibold text-ink-900 mt-2">
          Байршил ачаалахад алдаа гарлаа
        </Text>
        <Text className="text-[13px] text-ink-400 text-center mt-1.5" style={{ lineHeight: 20 }}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadLocations}
          className="bg-ink-900 rounded-xl items-center justify-center mt-5 px-8"
          style={{ height: 52 }}
        >
          <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
            Дахин оролдох
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!latestLocation) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary px-10">
        <View className="w-16 h-16 rounded-full bg-ink-100 items-center justify-center mb-4">
          <Ionicons name="location-outline" size={32} color={C.ink300} />
        </View>
        <Text className="text-sm font-semibold text-ink-500">Байршлын мэдээлэл байхгүй</Text>
        <Text className="text-[13px] text-ink-400 text-center mt-1.5" style={{ lineHeight: 20 }}>
          {childName}-ийн төхөөрөмжөөс байршлын шинэчлэлтүүд энд харагдана.
          Төхөөрөмжийн хэсгээс Байршлыг олох командыг илгээнэ үү.
        </Text>
        <TouchableOpacity
          onPress={loadLocations}
          className="bg-ink-900 rounded-xl items-center justify-center mt-5 px-8"
          style={{ height: 52 }}
        >
          <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
            Шинэчлэх
          </Text>
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
              strokeColor={C.ink900}
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
            description={`Сүүлд шинэчлэгдсэн: ${formatTime(latestLocation.timestamp)}`}
          />

          {/* History markers */}
          {locations.slice(0, -1).map((loc: LocationEntry) => (
            <Marker
              key={loc.timestamp}
              coordinate={{ latitude: loc.lat, longitude: loc.lng }}
              title={formatTime(loc.timestamp)}
              pinColor={C.ink300}
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
            <View className="w-14 h-14 rounded-full bg-ink-100 items-center justify-center">
              <Ionicons name="map-outline" size={28} color={C.ink400} />
            </View>
            <Text className="text-sm text-ink-500">
              Газрын зураг ашиглах боломжгүй
            </Text>
            <TouchableOpacity
              onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}
              className="bg-ink-900 rounded-xl items-center justify-center flex-row gap-2 px-6"
              style={{ height: 52 }}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
                Газрын зурагт нээх
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location list */}
          {locations.map((loc) => {
            const isLatest = loc.timestamp === latestLocation?.timestamp;
            return (
            <TouchableOpacity
              key={loc.timestamp}
              onPress={() => openInExternalMap(loc.lat, loc.lng)}
            >
              <View style={{ ...CARD, marginHorizontal: 16, marginBottom: 8, padding: 14 }}
                className="flex-row items-center gap-x-3"
              >
                <Ionicons
                  name={isLatest ? 'location' : 'location-outline'}
                  size={20}
                  color={isLatest ? C.teal : C.ink400}
                />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-ink-900" style={{ fontFamily: 'monospace' }}>
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </Text>
                  <Text className="text-[11px] text-ink-400 mt-0.5">
                    {formatTime(loc.timestamp)}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={C.ink300} />
              </View>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Info Panel */}
      <View
        style={{ ...CARD, position: 'absolute', bottom: 20, left: 16, right: 16, padding: 16 }}
      >
        <View className="flex-row items-center gap-x-2 mb-2">
          <Ionicons name="location" size={20} color={C.teal} />
          <Text className="text-sm font-semibold text-ink-900">
            Сүүлд мэдэгдсэн байршил
          </Text>
        </View>
        <TouchableOpacity onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}>
          <Text
            style={{ fontSize: 12, color: C.teal, textDecorationLine: 'underline', fontFamily: 'monospace' }}
          >
            {latestLocation.lat.toFixed(6)}, {latestLocation.lng.toFixed(6)}
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-ink-400 mt-1">
          Шинэчлэгдсэн: {formatTime(latestLocation.timestamp)}
        </Text>
        <Text className="text-[11px] text-ink-400 mt-1">
          Өнөөдөр {locations.length} байршлын цэг
        </Text>
      </View>

      {/* Refresh FAB */}
      <TouchableOpacity
        onPress={loadLocations}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-ink-900 items-center justify-center"
        style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}
      >
        <Ionicons name="refresh" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
