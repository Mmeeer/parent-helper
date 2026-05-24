// Both dev and prod builds target the VPS-hosted backend over HTTPS.
// `/parent-helper` prefix is terminated by nginx (TLS) and proxied to
// the backend on internal port 5003 (including Socket.io upgrades).
export const API_BASE_URL = 'https://primekids.masterclass.mn/parent-helper';

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

// Backend stores schedule.days as ints 0-6 (Sunday=0) to match the
// Android child app's `Calendar.DAY_OF_WEEK - 1` indexing in
// ScheduleEnforcer. The UI uses string labels for legibility, so we
// convert at the API boundary.
export const DAY_NAME_TO_NUM: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const DAY_NUM_TO_NAME: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};
