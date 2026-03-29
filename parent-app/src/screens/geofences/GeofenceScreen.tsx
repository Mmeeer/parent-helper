import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as api from '../../services/api';
import type { Geofence } from '../../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../types';
import { C } from '../../theme';

type Props = {
  readonly navigation: NativeStackNavigationProp<RootStackParamList, 'Geofences'>;
  readonly route: RouteProp<RootStackParamList, 'Geofences'>;
};

type FormData = {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
};

const DEFAULT_RADIUS = 200;
const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function GeofenceScreen({ route }: Props) {
  const { childId } = route.params;
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    name: '',
    lat: DEFAULT_REGION.latitude,
    lng: DEFAULT_REGION.longitude,
    radiusMeters: DEFAULT_RADIUS,
    alertOnEntry: true,
    alertOnExit: true,
  });
  const mapRef = useRef<MapView>(null);

  const loadGeofences = useCallback(async () => {
    try {
      const data = await api.getGeofences(childId);
      setGeofences(data);
    } catch {
      // May not have geofences yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadGeofences();
    }, [loadGeofences]),
  );

  const resetForm = () => {
    setForm({
      name: '',
      lat: DEFAULT_REGION.latitude,
      lng: DEFAULT_REGION.longitude,
      radiusMeters: DEFAULT_RADIUS,
      alertOnEntry: true,
      alertOnExit: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    if (!showForm) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setForm((prev) => ({ ...prev, lat: latitude, lng: longitude }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Алдаа', 'Геофенсийн нэрийг оруулна уу.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.updateGeofence(editingId, {
          name: form.name.trim(),
          lat: form.lat,
          lng: form.lng,
          radiusMeters: form.radiusMeters,
          alertOnEntry: form.alertOnEntry,
          alertOnExit: form.alertOnExit,
        });
        setGeofences((prev) => prev.map((g) => (g._id === editingId ? updated : g)));
      } else {
        const created = await api.createGeofence(childId, {
          name: form.name.trim(),
          lat: form.lat,
          lng: form.lng,
          radiusMeters: form.radiusMeters,
          alertOnEntry: form.alertOnEntry,
          alertOnExit: form.alertOnExit,
        });
        setGeofences((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err: any) {
      Alert.alert('Алдаа', err.message || 'Геофенс хадгалахад алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (geofence: Geofence) => {
    setEditingId(geofence._id);
    setForm({
      name: geofence.name,
      lat: geofence.lat,
      lng: geofence.lng,
      radiusMeters: geofence.radiusMeters,
      alertOnEntry: geofence.alertOnEntry,
      alertOnExit: geofence.alertOnExit,
    });
    setShowForm(true);
    mapRef.current?.animateToRegion({
      latitude: geofence.lat,
      longitude: geofence.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const doDelete = async (geofence: Geofence) => {
    try {
      await api.deleteGeofence(geofence._id);
      setGeofences((prev) => prev.filter((g) => g._id !== geofence._id));
    } catch (err: any) {
      Alert.alert('Алдаа', err.message || 'Геофенс устгахад алдаа гарлаа.');
    }
  };

  const handleDelete = (geofence: Geofence) => {
    Alert.alert(
      'Геофенс устгах',
      `"${geofence.name}"-г устгахдаа итгэлтэй байна уу?`,
      [
        { text: 'Цуцлах', style: 'cancel' },
        { text: 'Устгах', style: 'destructive', onPress: () => { void doDelete(geofence); } },
      ],
    );
  };

  const handleToggleActive = async (geofence: Geofence) => {
    try {
      const updated = await api.updateGeofence(geofence._id, { active: !geofence.active });
      setGeofences((prev) => prev.map((g) => (g._id === geofence._id ? updated : g)));
    } catch (err: any) {
      Alert.alert('Алдаа', err.message || 'Геофенс шинэчлэхэд алдаа гарлаа.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={
          geofences.length > 0
            ? {
                latitude: geofences[0].lat,
                longitude: geofences[0].lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : DEFAULT_REGION
        }
        onPress={handleMapPress}
      >
        {/* Existing geofences */}
        {geofences.map((g) => (
          <React.Fragment key={g._id}>
            <Marker
              coordinate={{ latitude: g.lat, longitude: g.lng }}
              title={g.name}
              description={`${g.radiusMeters}м радиус`}
              pinColor={g.active ? C.nest500 : C.gray400}
            />
            <Circle
              center={{ latitude: g.lat, longitude: g.lng }}
              radius={g.radiusMeters}
              fillColor={g.active ? 'rgba(11,122,237,0.10)' : 'rgba(156,163,175,0.1)'}
              strokeColor={g.active ? C.nest500 : C.gray400}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}

        {/* Form preview marker */}
        {showForm && (
          <>
            <Marker
              coordinate={{ latitude: form.lat, longitude: form.lng }}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setForm((prev) => ({ ...prev, lat: latitude, lng: longitude }));
              }}
              pinColor={C.nest500}
            />
            <Circle
              center={{ latitude: form.lat, longitude: form.lng }}
              radius={form.radiusMeters}
              fillColor="rgba(11,122,237,0.12)"
              strokeColor={C.nest500}
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      {/* Form Panel */}
      {showForm && (
        <View
          className="bg-white rounded-t-3xl shadow-lg absolute bottom-0 left-0 right-0 p-5 max-h-[55%]"
        >
          <ScrollView>
            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-2">
              {editingId ? 'ГЕОФЕНС ЗАСАХ' : 'ШИНЭ ГЕОФЕНС'}
            </Text>
            <Text className="text-sm font-display font-bold text-gray-900 mb-1">
              {editingId ? 'Геофенс засах' : 'Шинэ геофенс'}
            </Text>
            <Text className="text-xs text-gray-400 mb-4">
              Байршил тохируулахын тулд газрын зурагт дарах эсвэл маркерийг чирэх
            </Text>

            <TextInput
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder="Жнь. Гэр, Сургууль"
              className="rounded-2xl bg-gray-50 border border-gray-200 mb-3 px-4 h-12 text-sm text-gray-900"
              placeholderTextColor={C.gray300}
            />

            <Text className="text-xs font-bold text-gray-400 tracking-wide mb-2">РАДИУС (МЕТР)</Text>
            <View className="flex-row gap-x-2 mb-3">
              {[100, 200, 500, 1000].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setForm((prev) => ({ ...prev, radiusMeters: r }))}
                  className="px-3 py-1.5 rounded-2xl"
                  style={{ backgroundColor: form.radiusMeters === r ? C.nest500 : C.gray100 }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: form.radiusMeters === r ? '#FFFFFF' : C.gray500 }}
                  >
                    {r}м
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-sm text-gray-900">Орхоор мэдэгдэх</Text>
              <Switch
                value={form.alertOnEntry}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnEntry: val }))}
                trackColor={{ true: C.nest500, false: C.gray200 }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-sm text-gray-900">Гарахад мэдэгдэх</Text>
              <Switch
                value={form.alertOnExit}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnExit: val }))}
                trackColor={{ true: C.nest500, false: C.gray200 }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row mt-5 gap-x-3">
              <TouchableOpacity
                onPress={resetForm}
                className="flex-1 border border-gray-200 rounded-2xl items-center justify-center h-[52px]"
              >
                <Text className="text-sm font-semibold text-gray-500">Цуцлах</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className={`flex-1 bg-nest-500 rounded-2xl items-center justify-center shadow-lg h-[52px] ${saving ? 'opacity-60' : 'opacity-100'}`}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-display font-bold text-white tracking-wide">
                    {editingId ? 'Шинэчлэх' : 'Үүсгэх'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Geofence List (shown when form is hidden) */}
      {!showForm && (
        <View
          className="bg-white rounded-t-3xl shadow-lg border border-gray-100 absolute bottom-0 left-0 right-0 pt-4 px-4 max-h-[45%]"
        >
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGeofences(); }} />
            }
          >
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-xs font-bold text-gray-400 tracking-wide mb-1">ГЕОФЕНС</Text>
                <Text className="text-sm font-display font-bold text-gray-900">
                  Геофенсүүд ({geofences.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-nest-500 rounded-full flex-row items-center gap-1 px-4 shadow-lg h-9"
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text className="text-white font-display font-bold text-sm">Нэмэх</Text>
              </TouchableOpacity>
            </View>

            {geofences.length === 0 ? (
              <View className="items-center py-6">
                <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
                  <Ionicons name="navigate-outline" size={28} color={C.gray300} />
                </View>
                <Text className="text-sm font-semibold text-gray-500 mt-1">
                  Геофенс байхгүй
                </Text>
                <Text className="text-xs text-gray-400 text-center mt-1.5 px-5 leading-[18px]">
                  Хүүхдийн тодорхой газруудад орж, гарахад мэдэгдэл авахын тулд геофенс үүсгэнэ үү.
                </Text>
              </View>
            ) : (
              geofences.map((geofence) => (
                <View key={geofence._id} className="bg-white rounded-3xl border border-gray-100 mb-2.5 p-3.5">
                  <View className="flex-row items-center gap-x-2.5">
                    <View
                      className="w-10 h-10 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: geofence.active ? C.nest50 : C.gray100 }}
                    >
                      <Ionicons
                        name="navigate-circle"
                        size={22}
                        color={geofence.active ? C.nest500 : C.gray400}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-900">
                        {geofence.name}
                      </Text>
                      <Text className="text-[11px] text-gray-400 mt-0.5">
                        {geofence.radiusMeters}м радиус
                        {geofence.alertOnEntry ? ' · Орох' : ''}
                        {geofence.alertOnExit ? ' · Гарах' : ''}
                      </Text>
                    </View>
                    <Switch
                      value={geofence.active}
                      onValueChange={() => { void handleToggleActive(geofence); }}
                      trackColor={{ true: C.nest500, false: C.gray200 }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <View className="flex-row mt-2.5 pl-11 gap-x-4">
                    <TouchableOpacity onPress={() => handleEdit(geofence)} className="p-1">
                      <Ionicons name="create-outline" size={18} color={C.nest500} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        mapRef.current?.animateToRegion({
                          latitude: geofence.lat,
                          longitude: geofence.lng,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        });
                      }}
                      className="p-1"
                    >
                      <Ionicons name="locate-outline" size={18} color={C.nest500} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(geofence)} className="p-1">
                      <Ionicons name="trash-outline" size={18} color={C.danger500} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View className="h-4" />
          </ScrollView>
        </View>
      )}
    </View>
  );
}
