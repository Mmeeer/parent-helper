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
import { C } from '../../theme';

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
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-surface px-10">
        <View className="w-16 h-16 rounded-full bg-danger-50 items-center justify-center mb-4">
          <Ionicons name="alert-circle-outline" size={32} color={C.danger500} />
        </View>
        <Text className="text-sm font-bold text-gray-900 mt-2">
          Байршил ачаалахад алдаа гарлаа
        </Text>
        <Text className="text-[13px] text-gray-400 text-center mt-1.5 leading-5">
          {error}
        </Text>
        <TouchableOpacity
          onPress={loadLocations}
          className="bg-nest-500 rounded-2xl items-center justify-center mt-5 px-8 shadow-lg h-[52px]"
        >
          <Text className="text-sm font-display font-bold text-white tracking-wide">
            Дахин оролдох
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!latestLocation) {
    return (
      <View className="flex-1 justify-center items-center bg-surface px-10">
        <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
          <Ionicons name="location-outline" size={32} color={C.gray300} />
        </View>
        <Text className="text-sm font-semibold text-gray-500">Байршлын мэдээлэл байхгүй</Text>
        <Text className="text-[13px] text-gray-400 text-center mt-1.5 leading-5">
          {childName}-ийн төхөөрөмжөөс байршлын шинэчлэлтүүд энд харагдана.
          Төхөөрөмжийн хэсгээс Байршлыг олох командыг илгээнэ үү.
        </Text>
        <TouchableOpacity
          onPress={loadLocations}
          className="bg-nest-500 rounded-2xl items-center justify-center mt-5 px-8 shadow-lg h-[52px]"
        >
          <Text className="text-sm font-display font-bold text-white tracking-wide">
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
              strokeColor={C.nest500}
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
              pinColor={C.gray300}
              opacity={0.5}
            />
          ))}
        </MapView>
      ) : (
        <ScrollView
          className="flex-1 bg-surface"
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={loadLocations} />
          }
        >
          <View className="items-center py-10 gap-y-3">
            <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center">
              <Ionicons name="map-outline" size={28} color={C.gray400} />
            </View>
            <Text className="text-sm text-gray-500">
              Газрын зураг ашиглах боломжгүй
            </Text>
            <TouchableOpacity
              onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}
              className="bg-nest-500 rounded-2xl items-center justify-center flex-row gap-2 px-6 shadow-lg h-[52px]"
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text className="text-sm font-display font-bold text-white tracking-wide">
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
              <View
                className="bg-white rounded-3xl border border-gray-100 flex-row items-center gap-x-3 mx-4 mb-2 p-3.5"
              >
                <Ionicons
                  name={isLatest ? 'location' : 'location-outline'}
                  size={20}
                  color={isLatest ? C.nest500 : C.gray400}
                />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-900 font-mono">
                    {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                  </Text>
                  <Text className="text-[11px] text-gray-400 mt-0.5">
                    {formatTime(loc.timestamp)}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={C.gray300} />
              </View>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Info Panel */}
      <View
        className="bg-white rounded-3xl border border-gray-100 absolute bottom-5 left-4 right-4 p-4"
      >
        <View className="flex-row items-center gap-x-2 mb-2">
          <Ionicons name="location" size={20} color={C.nest500} />
          <Text className="text-sm font-bold text-gray-900">
            Сүүлд мэдэгдсэн байршил
          </Text>
        </View>
        <TouchableOpacity onPress={() => openInExternalMap(latestLocation.lat, latestLocation.lng)}>
          <Text
            className="text-xs text-nest-500 underline font-mono"
          >
            {latestLocation.lat.toFixed(6)}, {latestLocation.lng.toFixed(6)}
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-gray-400 mt-1">
          Шинэчлэгдсэн: {formatTime(latestLocation.timestamp)}
        </Text>
        <Text className="text-[11px] text-gray-400 mt-1">
          Өнөөдөр {locations.length} байршлын цэг
        </Text>
      </View>

      {/* Refresh FAB */}
      <TouchableOpacity
        onPress={loadLocations}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-nest-500 items-center justify-center shadow-lg"
      >
        <Ionicons name="refresh" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
