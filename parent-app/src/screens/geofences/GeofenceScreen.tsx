import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  IconButton,
  Chip,
  Switch,
  TextInput,
} from 'react-native-paper';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme';
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
        <ActivityIndicator size="large" color={colors.primary} />
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
              pinColor={g.active ? colors.primary : colors.textMuted}
            />
            <Circle
              center={{ latitude: g.lat, longitude: g.lng }}
              radius={g.radiusMeters}
              fillColor={g.active ? 'rgba(74,144,217,0.15)' : 'rgba(153,153,153,0.1)'}
              strokeColor={g.active ? colors.primary : colors.textMuted}
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
              pinColor={colors.secondary}
            />
            <Circle
              center={{ latitude: form.lat, longitude: form.lng }}
              radius={form.radiusMeters}
              fillColor="rgba(92,184,92,0.2)"
              strokeColor={colors.secondary}
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      {/* Form Panel */}
      {showForm && (
        <Surface
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-5"
          elevation={4}
          style={{ maxHeight: '55%' }}
        >
          <ScrollView>
            <Text variant="titleMedium" className="font-bold text-slate-800 mb-1">
              {editingId ? 'Edit Geofence' : 'New Geofence'}
            </Text>
            <Text variant="bodySmall" className="text-slate-500 mb-4">
              Tap the map or drag the marker to set location
            </Text>

            <TextInput
              label="Name"
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder="e.g. Home, School"
              mode="outlined"
              className="mb-3 bg-white"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              dense
            />

            <Text variant="labelLarge" className="font-semibold text-slate-800 mb-2 mt-1">
              Radius (meters)
            </Text>
            <View className="flex-row gap-x-2 mb-3">
              {[100, 200, 500, 1000].map((r) => (
                <Chip
                  key={r}
                  selected={form.radiusMeters === r}
                  onPress={() => setForm((prev) => ({ ...prev, radiusMeters: r }))}
                  showSelectedCheck={false}
                  className={`${form.radiusMeters === r ? 'bg-primary-600' : 'bg-surface-tertiary'}`}
                  textStyle={{
                    color: form.radiusMeters === r ? colors.white : colors.textSecondary,
                    fontWeight: '500',
                  }}
                >
                  {r}m
                </Chip>
              ))}
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text variant="bodyMedium" className="text-slate-800">Alert on Entry</Text>
              <Switch
                value={form.alertOnEntry}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnEntry: val }))}
                color={colors.primary}
              />
            </View>

            <View className="flex-row justify-between items-center mt-2">
              <Text variant="bodyMedium" className="text-slate-800">Alert on Exit</Text>
              <Switch
                value={form.alertOnExit}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnExit: val }))}
                color={colors.primary}
              />
            </View>

            <View className="flex-row mt-5 gap-x-3">
              <Button
                mode="outlined"
                onPress={resetForm}
                textColor={colors.textSecondary}
                className="flex-1 rounded-xl"
                style={{ borderColor: colors.border }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                disabled={saving}
                buttonColor={colors.primary}
                textColor={colors.white}
                className="flex-1 rounded-xl"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  editingId ? 'Update' : 'Create'
                )}
              </Button>
            </View>
          </ScrollView>
        </Surface>
      )}

      {/* Geofence List (shown when form is hidden) */}
      {!showForm && (
        <Surface
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl pt-4 px-4"
          elevation={4}
          style={{ maxHeight: '45%' }}
        >
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGeofences(); }} />
            }
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text variant="titleMedium" className="font-bold text-slate-800">
                Geofences ({geofences.length})
              </Text>
              <Button
                mode="contained"
                icon={() => <Ionicons name="add" size={18} color={colors.white} />}
                onPress={() => setShowForm(true)}
                buttonColor={colors.primary}
                textColor={colors.white}
                compact
                className="rounded-full"
              >
                Add
              </Button>
            </View>

            {geofences.length === 0 ? (
              <View className="items-center py-6">
                <Ionicons name="navigate-outline" size={48} color={colors.textMuted} />
                <Text variant="titleSmall" className="font-semibold text-slate-800 mt-3">
                  No Geofences
                </Text>
                <Text variant="bodySmall" className="text-slate-500 text-center mt-1.5 px-5">
                  Create geofences to get alerts when your child enters or leaves specific areas.
                </Text>
              </View>
            ) : (
              geofences.map((geofence) => (
                <Surface key={geofence._id} className="rounded-2xl p-3.5 mb-2.5 bg-surface-tertiary" elevation={0}>
                  <View className="flex-row items-center gap-x-2.5">
                    <Ionicons
                      name="navigate-circle"
                      size={24}
                      color={geofence.active ? colors.primary : colors.textMuted}
                    />
                    <View className="flex-1">
                      <Text variant="bodyLarge" className="font-semibold text-slate-800">
                        {geofence.name}
                      </Text>
                      <Text variant="labelSmall" className="text-slate-500 mt-0.5">
                        {geofence.radiusMeters}m radius
                        {geofence.alertOnEntry ? ' · Entry' : ''}
                        {geofence.alertOnExit ? ' · Exit' : ''}
                      </Text>
                    </View>
                    <Switch
                      value={geofence.active}
                      onValueChange={() => handleToggleActive(geofence)}
                      color={colors.primary}
                    />
                  </View>
                  <View className="flex-row mt-2.5 pl-9 gap-x-4">
                    <IconButton
                      icon={() => <Ionicons name="create-outline" size={18} color={colors.primary} />}
                      size={18}
                      onPress={() => handleEdit(geofence)}
                      className="m-0"
                    />
                    <IconButton
                      icon={() => <Ionicons name="locate-outline" size={18} color={colors.primary} />}
                      size={18}
                      onPress={() => {
                        mapRef.current?.animateToRegion({
                          latitude: geofence.lat,
                          longitude: geofence.lng,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        });
                      }}
                      className="m-0"
                    />
                    <IconButton
                      icon={() => <Ionicons name="trash-outline" size={18} color={colors.danger} />}
                      size={18}
                      onPress={() => handleDelete(geofence)}
                      className="m-0"
                    />
                  </View>
                </Surface>
              ))
            )}

            <View className="h-4" />
          </ScrollView>
        </Surface>
      )}
    </View>
  );
}
