// ─── User / Auth ─────────────────────────────────────────
export interface User {
  id: string;
  /** Optional since phone-first auth: accounts registered by phone may have no email. */
  email: string | null;
  phone?: string | null;
  name: string;
  emailVerified: boolean;
  subscription?: {
    active: boolean;
    key?: string;
    maxKids?: number;
    currentKids?: number;
    expiresAt?: string;
    status?: string;
  };
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

/** Public app configuration from GET /config/app (no auth). */
export interface AppConfig {
  /** Terms of Service text shown in the parent app, or null when not configured. */
  termsParent: string | null;
  /** Terms text for the child app, or null. */
  termsChild: string | null;
  /** YouTube URL for the dashboard tutorial card, or null to hide it. */
  tutorialVideoUrl: string | null;
  /** When true, registration and phone-based password reset require an SMS OTP. */
  otpEnabled?: boolean;
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
  /** Last time the child actually used the device (screen-time activity), or null/unknown. */
  lastActivityAt?: string | null;
  batteryLevel?: number;
  appVersion: string;
  /** iOS only: has a parent granted Screen Time (Family Controls) on the child's device? null/undefined = unknown. */
  screenTimeAuthorized?: boolean | null;
}

export interface DeviceStatus {
  id: string;
  status: 'online' | 'offline';
  lastSeen: string;
  /** Last time the child actually used the device (screen-time activity), or null/unknown. */
  lastActivityAt?: string | null;
  batteryLevel?: number;
  platform: string;
  model: string;
  osVersion: string;
  appVersion: string;
  /** iOS only: has a parent granted Screen Time (Family Controls) on the child's device? null/undefined = unknown. */
  screenTimeAuthorized?: boolean | null;
}

export interface PairDeviceResponse {
  deviceId: string;
  pairingCode: string;
  expiresAt: string;
  expiresIn: number;
}

export interface SubscriptionInfo {
  active: boolean;
  subscription: {
    key: string;
    maxKids: number;
    currentKids: number;
    expiresAt: string;
    activatedAt?: string;
    durationDays?: number;
    status: string;
  } | null;
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
  /** iOS: 'categories' blocks by category; 'allowlist' only opens the parent's allow list. */
  mode?: 'categories' | 'allowlist';
}

/** Summary of the FamilyActivitySelection picked on the child's iPhone. */
export interface IosSelectionSummary {
  appCount: number;
  categoryCount: number;
  webDomainCount: number;
  updatedAt: string;
}

/** A named blocking group (app set) defined on the child's iPhone. */
export interface IosGroupMeta {
  id: string;
  name: string;
  appCount: number;
  categoryCount: number;
  enabled: boolean;
}

/** A per-app time-limit rule defined on the child's iPhone. */
export interface IosLimitMeta {
  id: string;
  name: string;
  appCount: number;
  categoryCount: number;
  limitMin: number;
  enabled: boolean;
}

export interface Rules {
  _id: string;
  childId: string;
  screenTime: ScreenTimeRules;
  blockedApps: string[];
  webFilter: WebFilter;
  /** iOS only: shield the apps/categories selected on the child's device. */
  iosBlockSelected?: boolean;
  /** iOS only: present once the child device has uploaded a selection. */
  iosSelection?: IosSelectionSummary | null;
  /** iOS only: blocking groups defined on the child's device. */
  iosGroups?: IosGroupMeta[];
  /** iOS only: per-app limit rules defined on the child's device. */
  iosLimits?: IosLimitMeta[];
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
  | 'uninstall_attempt'
  | 'overlay_permission_revoked'
  | 'sos';

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
  Onboarding: undefined;
  MainTabs: undefined;
  ChildDetail: { childId: string; childName: string };
  RulesOverview: { childId: string; childName: string };
  ScreenTimeRules: { childId: string; childName: string };
  AppRules: { childId: string; childName: string };
  WebFilter: { childId: string; childName: string };
  LocationMap: { childId: string; childName: string };
  DevicesList: { childId: string; childName: string };
  PairDevice: { childId: string; childName: string };
  DeviceDetail: { deviceId: string };
  Reports: { childId: string; childName: string };
  Geofences: { childId: string; childName: string };
  ForgotPassword: undefined;
  AddChild: undefined;
  ActivateSubscription: undefined;
  VerifyEmail: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  PrivacyPolicy: undefined;
};
