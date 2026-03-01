import React, { useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
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
              pinColor={g.active ? COLORS.primary : COLORS.textLight}
            />
            <Circle
              center={{ latitude: g.lat, longitude: g.lng }}
              radius={g.radiusMeters}
              fillColor={g.active ? 'rgba(74,144,217,0.15)' : 'rgba(153,153,153,0.1)'}
              strokeColor={g.active ? COLORS.primary : COLORS.textLight}
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
              pinColor={COLORS.secondary}
            />
            <Circle
              center={{ latitude: form.lat, longitude: form.lng }}
              radius={form.radiusMeters}
              fillColor="rgba(92,184,92,0.2)"
              strokeColor={COLORS.secondary}
              strokeWidth={2}
            />
          </>
        )}
      </MapView>

      {/* Form Panel */}
      {showForm && (
        <View style={styles.formPanel}>
          <ScrollView>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit Geofence' : 'New Geofence'}
            </Text>
            <Text style={styles.formHint}>Tap the map or drag the marker to set location</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              placeholder="e.g. Home, School"
              placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.label}>Radius (meters)</Text>
            <View style={styles.radiusRow}>
              {[100, 200, 500, 1000].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusChip, form.radiusMeters === r && styles.radiusChipActive]}
                  onPress={() => setForm((prev) => ({ ...prev, radiusMeters: r }))}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      form.radiusMeters === r && styles.radiusChipTextActive,
                    ]}
                  >
                    {r}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Alert on Entry</Text>
              <Switch
                value={form.alertOnEntry}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnEntry: val }))}
                trackColor={{ true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Alert on Exit</Text>
              <Switch
                value={form.alertOnExit}
                onValueChange={(val) => setForm((prev) => ({ ...prev, alertOnExit: val }))}
                trackColor={{ true: COLORS.primary }}
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingId ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Geofence List (shown when form is hidden) */}
      {!showForm && (
        <View style={styles.listPanel}>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGeofences(); }} />
            }
          >
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                Geofences ({geofences.length})
              </Text>
              <TouchableOpacity
                style={styles.addFab}
                onPress={() => setShowForm(true)}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.addFabText}>Add</Text>
              </TouchableOpacity>
            </View>

            {geofences.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="navigate-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyTitle}>No Geofences</Text>
                <Text style={styles.emptySubtitle}>
                  Create geofences to get alerts when your child enters or leaves specific areas.
                </Text>
              </View>
            ) : (
              geofences.map((geofence) => (
                <View key={geofence._id} style={styles.geofenceCard}>
                  <View style={styles.geofenceHeader}>
                    <Ionicons
                      name="navigate-circle"
                      size={24}
                      color={geofence.active ? COLORS.primary : COLORS.textLight}
                    />
                    <View style={styles.geofenceInfo}>
                      <Text style={styles.geofenceName}>{geofence.name}</Text>
                      <Text style={styles.geofenceDetail}>
                        {geofence.radiusMeters}m radius
                        {geofence.alertOnEntry ? ' · Entry' : ''}
                        {geofence.alertOnExit ? ' · Exit' : ''}
                      </Text>
                    </View>
                    <Switch
                      value={geofence.active}
                      onValueChange={() => handleToggleActive(geofence)}
                      trackColor={{ true: COLORS.primary }}
                    />
                  </View>
                  <View style={styles.geofenceActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(geofence)}
                    >
                      <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        mapRef.current?.animateToRegion({
                          latitude: geofence.lat,
                          longitude: geofence.lng,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        });
                      }}
                    >
                      <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.actionButtonText}>Show</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(geofence)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                      <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
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
  },
  map: {
    flex: 1,
  },
  // Form Panel
  formPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '55%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  formHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  radiusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  radiusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  radiusChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  radiusChipTextActive: {
    color: COLORS.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  switchLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  // List Panel
  listPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '45%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  addFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addFabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  geofenceCard: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  geofenceInfo: {
    flex: 1,
  },
  geofenceName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  geofenceDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  geofenceActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 16,
    paddingLeft: 34,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
