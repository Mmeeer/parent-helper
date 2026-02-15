// ─── User / Auth ─────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium' | 'family';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Child ───────────────────────────────────────────────
export interface Child {
  _id: string;
  name: string;
  age: number;
  parentId: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Device ──────────────────────────────────────────────
export interface Device {
  _id: string;
  childId: string;
  parentId: string;
  platform: 'android' | 'ios';
  model: string;
  osVersion: string;
  pairingCode?: string;
  paired: boolean;
  status: 'online' | 'offline';
  lastSeen: string;
  batteryLevel?: number;
  appVersion: string;
}

export interface DeviceStatus {
  id: string;
  status: 'online' | 'offline';
  lastSeen: string;
  batteryLevel?: number;
  platform: string;
  model: string;
  osVersion: string;
  appVersion: string;
}

export interface PairDeviceResponse {
  deviceId: string;
  pairingCode: string;
}

// ─── Rules ───────────────────────────────────────────────
export interface PerAppLimit {
  appId: string;
  appName: string;
  limitMin: number;
}

export interface Schedule {
  days: string[];
  startTime: string;
  endTime: string;
  blocked: boolean;
}

export interface ScreenTimeRules {
  dailyLimitMin: number;
  perApp: PerAppLimit[];
  schedule: Schedule[];
}

export interface WebFilter {
  categories: string[];
  customBlock: string[];
  customAllow: string[];
}

export interface Rules {
  _id: string;
  childId: string;
  screenTime: ScreenTimeRules;
  blockedApps: string[];
  webFilter: WebFilter;
}

// ─── Activity ────────────────────────────────────────────
export interface AppUsageEntry {
  packageName: string;
  appName: string;
  durationMin: number;
}

export interface WebEntry {
  url: string;
  timestamp: string;
  blocked: boolean;
}

export interface LocationEntry {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface ActivitySummary {
  childId: string;
  period: 'day' | 'week' | 'month';
  totalScreenTimeMin: number;
  totalBlocked: number;
  totalWebVisits: number;
  topApps: AppUsageEntry[];
  daysTracked: number;
}

// ─── Alerts ──────────────────────────────────────────────
export type AlertType =
  | 'screen_time_limit'
  | 'new_app_installed'
  | 'blocked_content'
  | 'geofence_trigger'
  | 'device_offline'
  | 'unusual_pattern'
  | 'uninstall_attempt';

export interface Alert {
  _id: string;
  parentId: string;
  childId: string;
  type: AlertType;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  page: number;
  totalPages: number;
  total: number;
}

// ─── Navigation ──────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  ChildDetail: { childId: string; childName: string };
  RulesOverview: { childId: string; childName: string };
  ScreenTimeRules: { childId: string; childName: string };
  AppRules: { childId: string; childName: string };
  WebFilter: { childId: string; childName: string };
  LocationMap: { childId: string; childName: string };
  PairDevice: { childId: string; childName: string };
  DeviceDetail: { deviceId: string };
  AddChild: undefined;
};
