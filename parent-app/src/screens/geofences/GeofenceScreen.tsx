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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Geofences'>;
  route: RouteProp<RootStackParamList, 'Geofences'>;
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
      Alert.alert('Error', 'Please enter a name for the geofence.');
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
      Alert.alert('Error', err.message || 'Failed to save geofence.');
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

  const handleDelete = (geofence: Geofence) => {
    Alert.alert(
      'Delete Geofence',
      `Are you sure you want to delete "${geofence.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteGeofence(geofence._id);
              setGeofences((prev) => prev.filter((g) => g._id !== geofence._id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete geofence.');
            }
          },
        },
      ],
    );
  };

  const handleToggleActive = async (geofence: Geofence) => {
    try {
      const updated = await api.updateGeofence(geofence._id, { active: !geofence.active });
      setGeofences((prev) => prev.map((g) => (g._id === geofence._id ? updated : g)));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update geofence.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-secondary">
        <ActivityIndicator size="large" color="#4F46E5" />
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
              description={`${g.radiusMeters}m radius`}
              pinColor={g.active ? '#4F46E5' : '#94A3B8'}
            />
            <Circle
              center={{ latitude: g.lat, longitude: g.lng }}
              radius={g.radiusMeters}
              fillColor={g.active ? 'rgba(74,144,217,0.15)' : 'rgba(153,153,153,0.1)'}
              strokeColor={g.active ? '#4F46E5' : '#94A3B8'}
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
              pinColor="#0D9488"
            />
            <Circle
              center={{ latitude: form.lat, longitude: form.lng }}
              radius={form.radiusMeters}
              fillColor="rgba(92,184,92,0.2)"
              strokeColor="#0D9488"
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      {/* Form Panel */}
      {showForm && (
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-5 bg-white shadow-sm shadow-black/5"
          style={{ maxHeight: '55%' }}
        >
          <ScrollView>
            <Text className="text-base font-bold text-slate-800 mb-1">
              {editingId ? 'Edit Geofence' : 'New Geofence'}
            </Text>
            <Text className="text-xs text-slate-500 mb-4">
              Tap the map or drag the marker to set location
            </Text>

            <TextInput
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder="e.g. Home, School"
              className="mb-3 bg-white border border-slate-200 rounded-xl px-4 h-12 text-sm text-slate-800"
            />

            <Text className="text-sm font-semibold text-slate-800 mb-2 mt-1">
              Radius (meters)
            </Text>
            <View className="flex-row gap-x-2 mb-3">
              {[100, 200, 500, 1000].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setForm((prev) => ({ ...prev, radiusMeters: r }))}
                  className={`px-3 py-1.5 rounded-xl ${form.radiusMeters === r ? 'bg-primary-600' : 'bg-slate-100'}`}
                >
                  <Text className={`${form.radiusMeters === r ? 'text-white' : 'text-slate-500'} text-xs font-medium`}>
                    {r}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-sm text-slate-800">Alert on Entry</Text>
              <Switch
                value={form.alertOnEntry}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnEntry: val }))}
                trackColor={{ true: '#4F46E5', false: '#E2E8F0' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-sm text-slate-800">Alert on Exit</Text>
              <Switch
                value={form.alertOnExit}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnExit: val }))}
                trackColor={{ true: '#4F46E5', false: '#E2E8F0' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row mt-5 gap-x-3">
              <TouchableOpacity
                onPress={resetForm}
                className="flex-1 border border-slate-200 rounded-xl py-3 items-center"
              >
                <Text className="text-slate-500 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-1 bg-primary-600 rounded-xl py-3 items-center justify-center"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold">{editingId ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Geofence List (shown when form is hidden) */}
      {!showForm && (
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl pt-4 px-4 bg-white shadow-sm shadow-black/5"
          style={{ maxHeight: '45%' }}
        >
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGeofences(); }} />
            }
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-base font-bold text-slate-800">
                Geofences ({geofences.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-primary-600 rounded-full py-2 px-4 flex-row items-center gap-1"
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text className="text-white font-bold text-sm">Add</Text>
              </TouchableOpacity>
            </View>

            {geofences.length === 0 ? (
              <View className="items-center py-6">
                <Ionicons name="navigate-outline" size={48} color="#94A3B8" />
                <Text className="text-sm font-semibold text-slate-800 mt-3">
                  No Geofences
                </Text>
                <Text className="text-xs text-slate-500 text-center mt-1.5 px-5">
                  Create geofences to get alerts when your child enters or leaves specific areas.
                </Text>
              </View>
            ) : (
              geofences.map((geofence) => (
                <View key={geofence._id} className="rounded-2xl p-3.5 mb-2.5 bg-surface-tertiary">
                  <View className="flex-row items-center gap-x-2.5">
                    <Ionicons
                      name="navigate-circle"
                      size={24}
                      color={geofence.active ? '#4F46E5' : '#94A3B8'}
                    />
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-slate-800">
                        {geofence.name}
                      </Text>
                      <Text className="text-[11px] text-slate-500 mt-0.5">
                        {geofence.radiusMeters}m radius
                        {geofence.alertOnEntry ? ' · Entry' : ''}
                        {geofence.alertOnExit ? ' · Exit' : ''}
                      </Text>
                    </View>
                    <Switch
                      value={geofence.active}
                      onValueChange={() => handleToggleActive(geofence)}
                      trackColor={{ true: '#4F46E5', false: '#E2E8F0' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <View className="flex-row mt-2.5 pl-9 gap-x-4">
                    <TouchableOpacity onPress={() => handleEdit(geofence)} className="p-1">
                      <Ionicons name="create-outline" size={18} color="#4F46E5" />
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
                      <Ionicons name="locate-outline" size={18} color="#4F46E5" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(geofence)} className="p-1">
                      <Ionicons name="trash-outline" size={18} color="#E11D48" />
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
