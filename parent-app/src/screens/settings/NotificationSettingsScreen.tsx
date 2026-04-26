import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../../services/api';
import type { AlertSettings } from '../../services/api';
import { C } from '../../theme';
import { useTranslation } from 'react-i18next';

const DEFAULT_SETTINGS: AlertSettings = {
  enabled: true,
  types: {
    screen_time_limit: true,
    new_app_installed: true,
    blocked_content: true,
    geofence_trigger: true,
    device_offline: true,
    unusual_pattern: true,
    uninstall_attempt: true,
    sos: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
};

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ALERT_TYPE_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    screen_time_limit: { label: t('notifications.screenTimeExceeded'), icon: 'time-outline' },
    new_app_installed: { label: t('notifications.newAppInstalled'), icon: 'download-outline' },
    blocked_content: { label: t('notifications.blockedContent'), icon: 'shield-outline' },
    geofence_trigger: { label: t('notifications.geofenceTrigger'), icon: 'location-outline' },
    device_offline: { label: t('notifications.deviceOffline'), icon: 'cloud-offline-outline' },
    unusual_pattern: { label: t('notifications.unusualPattern'), icon: 'warning-outline' },
    uninstall_attempt: { label: t('notifications.uninstallAttempt'), icon: 'trash-outline' },
    sos: { label: t('notifications.sosAlert'), icon: 'alert-circle-outline' },
  };

  useEffect(() => {
    api.getAlertSettings()
      .then(({ alertSettings }) => {
        if (alertSettings) setSettings(alertSettings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async (updated: AlertSettings) => {
    setSaving(true);
    try {
      await api.updateAlertSettings(updated);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('notifications.saveError'));
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleEnabled = () => {
    const updated = { ...settings, enabled: !settings.enabled };
    setSettings(updated);
    handleSave(updated);
  };

  const toggleType = (type: string) => {
    const updated = {
      ...settings,
      types: { ...settings.types, [type]: !settings.types[type as keyof typeof settings.types] },
    };
    setSettings(updated);
    handleSave(updated);
  };

  const toggleQuietHours = () => {
    const updated = {
      ...settings,
      quietHours: { ...settings.quietHours, enabled: !settings.quietHours.enabled },
    };
    setSettings(updated);
    handleSave(updated);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={C.nest500} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" showsVerticalScrollIndicator={false}>
      <View className="px-6 pt-6 pb-10">
        {/* Master toggle */}
        <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-6">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-warm-50 items-center justify-center mr-3">
              <Ionicons name="notifications-outline" size={18} color={C.warm500} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-800">{t('notifications.notificationsTitle')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">{t('notifications.enableAll')}</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: C.gray200, true: C.safe500 }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Alert types */}
        <Text className="text-xs text-gray-400 font-bold px-1 mb-2">{t('notifications.types')}</Text>
        <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-6" style={{ opacity: settings.enabled ? 1 : 0.5 }}>
          {Object.entries(ALERT_TYPE_LABELS).map(([key, { label, icon }], index) => (
            <View
              key={key}
              className={`p-4 flex-row items-center ${index < Object.keys(ALERT_TYPE_LABELS).length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <View className="w-9 h-9 rounded-xl bg-nest-50 items-center justify-center mr-3">
                <Ionicons name={icon} size={18} color={C.nest500} />
              </View>
              <Text className="flex-1 text-sm font-semibold text-gray-800">{label}</Text>
              <Switch
                value={settings.types[key as keyof typeof settings.types]}
                onValueChange={() => toggleType(key)}
                trackColor={{ false: C.gray200, true: C.safe500 }}
                thumbColor="#ffffff"
                disabled={!settings.enabled}
              />
            </View>
          ))}
        </View>

        {/* Quiet hours */}
        <Text className="text-xs text-gray-400 font-bold px-1 mb-2">{t('notifications.quietHours')}</Text>
        <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 mb-2" style={{ opacity: settings.enabled ? 1 : 0.5 }}>
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center mr-3">
              <Ionicons name="moon-outline" size={18} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-800">{t('notifications.quietHoursTitle')}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {settings.quietHours.start} – {settings.quietHours.end}
              </Text>
            </View>
            <Switch
              value={settings.quietHours.enabled}
              onValueChange={toggleQuietHours}
              trackColor={{ false: C.gray200, true: C.safe500 }}
              thumbColor="#ffffff"
              disabled={!settings.enabled}
            />
          </View>
        </View>
        <Text className="text-xs text-gray-400 font-medium px-2 mb-6">
          {t('notifications.quietHoursDesc')}
        </Text>

        {saving && (
          <View className="flex-row items-center justify-center py-2">
            <ActivityIndicator size="small" color={C.nest500} />
            <Text className="text-xs text-gray-400 ml-2">{t('notifications.saving')}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
