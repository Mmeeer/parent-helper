export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000'  // Android emulator → host machine
  : 'https://api.parenthelper.com';

export const COLORS = {
  primary: '#4A90D9',
  primaryDark: '#357ABD',
  secondary: '#5CB85C',
  danger: '#D9534F',
  warning: '#F0AD4E',
  info: '#5BC0DE',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  white: '#FFFFFF',
  black: '#000000',
  online: '#5CB85C',
  offline: '#999999',
};

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
  screen_time_limit: '#F0AD4E',
  new_app_installed: '#5BC0DE',
  blocked_content: '#D9534F',
  geofence_trigger: '#4A90D9',
  device_offline: '#999999',
  unusual_pattern: '#D9534F',
  uninstall_attempt: '#D9534F',
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
