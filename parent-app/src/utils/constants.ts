// Both dev and prod builds target the VPS-hosted staging backend.
// `/parent-helper` prefix is stripped by nginx on port 8080 and proxied to
// the backend on internal port 5003 (including Socket.io upgrades).
export const API_BASE_URL = 'http://139.59.107.13:8080/parent-helper';

export const ALERT_TYPE_LABELS: Record<string, string> = {
  screen_time_limit: 'Screen Time Limit',
  new_app_installed: 'New App Installed',
  blocked_content: 'Blocked Content',
  geofence_trigger: 'Geofence Alert',
  device_offline: 'Device Offline',
  unusual_pattern: 'Unusual Activity',
  uninstall_attempt: 'Uninstall Attempt',
};

export const ALERT_TYPE_COLORS: Record<string, string> = {
  screen_time_limit: '#D97706',
  new_app_installed: '#0EA5E9',
  blocked_content: '#E11D48',
  geofence_trigger: '#4F46E5',
  device_offline: '#94A3B8',
  unusual_pattern: '#E11D48',
  uninstall_attempt: '#E11D48',
};

export const WEB_FILTER_CATEGORIES = [
  'adult',
  'gambling',
  'violence',
  'drugs',
  'weapons',
  'hate',
  'malware',
  'phishing',
  'social_media',
  'gaming',
  'streaming',
];

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
