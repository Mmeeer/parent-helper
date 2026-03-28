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
import { C, CARD, LABEL } from '../../theme';

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
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color={C.ink900} />
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
              pinColor={g.active ? C.ink900 : C.ink400}
            />
            <Circle
              center={{ latitude: g.lat, longitude: g.lng }}
              radius={g.radiusMeters}
              fillColor={g.active ? 'rgba(28,25,23,0.08)' : 'rgba(153,153,153,0.1)'}
              strokeColor={g.active ? C.ink900 : C.ink400}
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
              pinColor={C.teal}
            />
            <Circle
              center={{ latitude: form.lat, longitude: form.lng }}
              radius={form.radiusMeters}
              fillColor="rgba(13,148,136,0.12)"
              strokeColor={C.teal}
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      {/* Form Panel */}
      {showForm && (
        <View
          style={{ ...CARD, position: 'absolute', bottom: 0, left: 0, right: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '55%' }}
        >
          <ScrollView>
            <Text style={[LABEL, { marginBottom: 8 }]}>
              {editingId ? 'ГЕОФЕНС ЗАСАХ' : 'ШИНЭ ГЕОФЕНС'}
            </Text>
            <Text className="text-sm font-semibold text-ink-900 mb-1">
              {editingId ? 'Геофенс засах' : 'Шинэ геофенс'}
            </Text>
            <Text className="text-xs text-ink-400 mb-4">
              Байршил тохируулахын тулд газрын зурагт дарах эсвэл маркерийг чирэх
            </Text>

            <TextInput
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder="Жнь. Гэр, Сургууль"
              style={{
                marginBottom: 12,
                backgroundColor: C.bg,
                borderWidth: 1,
                borderColor: C.ink200,
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 48,
                fontSize: 14,
                color: C.ink900,
              }}
              placeholderTextColor={C.ink300}
            />

            <Text style={[LABEL, { marginBottom: 8 }]}>РАДИУС (МЕТР)</Text>
            <View className="flex-row gap-x-2 mb-3">
              {[100, 200, 500, 1000].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setForm((prev) => ({ ...prev, radiusMeters: r }))}
                  className="px-3 py-1.5 rounded-xl"
                  style={{ backgroundColor: form.radiusMeters === r ? C.ink900 : C.ink100 }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: form.radiusMeters === r ? '#FFFFFF' : C.ink500 }}
                  >
                    {r}м
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-sm text-ink-900">Орхоор мэдэгдэх</Text>
              <Switch
                value={form.alertOnEntry}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnEntry: val }))}
                trackColor={{ true: C.teal, false: C.ink200 }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-sm text-ink-900">Гарахад мэдэгдэх</Text>
              <Switch
                value={form.alertOnExit}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnExit: val }))}
                trackColor={{ true: C.teal, false: C.ink200 }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row mt-5 gap-x-3">
              <TouchableOpacity
                onPress={resetForm}
                className="flex-1 border border-ink-200 rounded-xl items-center justify-center"
                style={{ height: 52 }}
              >
                <Text className="text-sm font-semibold text-ink-500">Цуцлах</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-1 bg-ink-900 rounded-xl items-center justify-center"
                style={{ height: 52, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-bold text-white" style={{ letterSpacing: 0.4 }}>
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
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: C.border, paddingTop: 16, paddingHorizontal: 16, maxHeight: '45%' }}
        >
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGeofences(); }} />
            }
          >
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text style={[LABEL, { marginBottom: 4 }]}>ГЕОФЕНС</Text>
                <Text className="text-sm font-semibold text-ink-900">
                  Геофенсүүд ({geofences.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-ink-900 rounded-full flex-row items-center gap-1 px-4"
                style={{ height: 36 }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-sm">Нэмэх</Text>
              </TouchableOpacity>
            </View>

            {geofences.length === 0 ? (
              <View className="items-center py-6">
                <View className="w-14 h-14 rounded-full bg-ink-100 items-center justify-center mb-3">
                  <Ionicons name="navigate-outline" size={28} color={C.ink300} />
                </View>
                <Text className="text-sm font-semibold text-ink-500 mt-1">
                  Геофенс байхгүй
                </Text>
                <Text className="text-xs text-ink-400 text-center mt-1.5 px-5" style={{ lineHeight: 18 }}>
                  Хүүхдийн тодорхой газруудад орж, гарахад мэдэгдэл авахын тулд геофенс үүсгэнэ үү.
                </Text>
              </View>
            ) : (
              geofences.map((geofence) => (
                <View key={geofence._id} style={{ ...CARD, marginBottom: 10, padding: 14 }}>
                  <View className="flex-row items-center gap-x-2.5">
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center"
                      style={{ backgroundColor: geofence.active ? '#1A0d9488' : C.ink100 }}
                    >
                      <Ionicons
                        name="navigate-circle"
                        size={22}
                        color={geofence.active ? C.teal : C.ink400}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-ink-900">
                        {geofence.name}
                      </Text>
                      <Text className="text-[11px] text-ink-400 mt-0.5">
                        {geofence.radiusMeters}м радиус
                        {geofence.alertOnEntry ? ' · Орох' : ''}
                        {geofence.alertOnExit ? ' · Гарах' : ''}
                      </Text>
                    </View>
                    <Switch
                      value={geofence.active}
                      onValueChange={() => { void handleToggleActive(geofence); }}
                      trackColor={{ true: C.teal, false: C.ink200 }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <View className="flex-row mt-2.5 pl-11 gap-x-4">
                    <TouchableOpacity onPress={() => handleEdit(geofence)} className="p-1">
                      <Ionicons name="create-outline" size={18} color={C.ink600} />
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
                      <Ionicons name="locate-outline" size={18} color={C.teal} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(geofence)} className="p-1">
                      <Ionicons name="trash-outline" size={18} color={C.red} />
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
