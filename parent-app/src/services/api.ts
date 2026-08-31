import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';
import type {
  User,
  AuthResponse,
  TokenPair,
  Child,
  DeviceStatus,
  PairDeviceResponse,
  Rules,
  ActivitySummary,
  AppUsageEntry,
  WebEntry,
  LocationEntry,
  AlertsResponse,
  Alert,
  AppConfig,
} from '../types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

// ─── Token Management ────────────────────────────────────
export async function loadTokens(): Promise<void> {
  accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function saveTokens(tokens: TokenPair): Promise<void> {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Seconds until the current access token expires (null if unknown). */
function accessTokenTtl(): number | null {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(globalThis.atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp - Math.floor(Date.now() / 1000) : null;
  } catch {
    return null;
  }
}

/** Returns an access token that is valid for at least ~2 more minutes, refreshing if needed. */
export async function getFreshAccessToken(): Promise<string | null> {
  const ttl = accessTokenTtl();
  if (accessToken && (ttl === null || ttl > 120)) return accessToken;
  if (refreshToken) await tryRefreshToken();
  return accessToken;
}

// ─── HTTP Client ─────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const sentWithToken = accessToken;
  let response = await fetch(url, { ...options, headers });

  // If 401 and we have a refresh token, refresh (single-flight) and retry once.
  // Concurrent 401s share ONE refresh: the backend rotates refresh tokens and treats a
  // second use of the old token as reuse → it would invalidate every session.
  if (response.status === 401 && refreshToken) {
    // Another request may already have refreshed since we sent ours.
    const refreshed = accessToken && accessToken !== sentWithToken ? true : await tryRefreshToken();
    if (refreshed && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  return response.json();
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const tokens: TokenPair = await res.json();
      await saveTokens(tokens);
      return true;
    } catch {
      return false;
    } finally {
      // Let the next expiry start a fresh refresh cycle.
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();
  return refreshInFlight;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── Auth ────────────────────────────────────────────────
/** `identifier` is a phone number or an email — the backend resolves either. */
export async function login(identifier: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    // `email` is included when the identifier looks like one, so this build also works
    // against a backend that predates identifier-based login.
    body: JSON.stringify({ identifier, password, ...(identifier.includes('@') ? { email: identifier } : {}) }),
  });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export interface RegisterData {
  name: string;
  /** Required: 6-20 chars, digits with an optional leading +. */
  phone: string;
  password: string;
  /** Optional; omitted from the request when empty. */
  email?: string;
  acceptedTerms: boolean;
}

export async function register({ name, phone, password, email, acceptedTerms }: RegisterData): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    // Email is optional; omit the field entirely when empty.
    body: JSON.stringify({
      name,
      phone,
      password,
      acceptedTerms,
      ...(email?.trim() ? { email: email.trim() } : {}),
    }),
  });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

// ─── App Config ──────────────────────────────────────────
/** Public app configuration (terms texts, tutorial video URL). No auth required. */
export async function getAppConfig(): Promise<AppConfig> {
  return request<AppConfig>('/config/app');
}

export async function logout(): Promise<void> {
  await clearTokens();
}

export async function forgotPassword(email: string): Promise<{ message: string; resetCode?: string }> {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

export async function verifyEmail(code: string): Promise<{ message: string; emailVerified: boolean }> {
  return request('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function resendVerification(): Promise<{ message: string }> {
  return request('/auth/resend-verification', {
    method: 'POST',
  });
}

export async function deleteAccount(password: string, reason?: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password, reason }),
  });
}

export async function cancelDeletion(): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/cancel-deletion', {
    method: 'POST',
  });
}

// ─── Profile ────────────────────────────────────────────
export async function updateProfile(name: string): Promise<User> {
  return request<User>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ─── Alert Settings ─────────────────────────────────────
export interface AlertSettings {
  enabled: boolean;
  types: {
    screen_time_limit: boolean;
    new_app_installed: boolean;
    blocked_content: boolean;
    geofence_trigger: boolean;
    device_offline: boolean;
    unusual_pattern: boolean;
    uninstall_attempt: boolean;
    sos: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
  };
}

export async function getAlertSettings(): Promise<{ alertSettings: AlertSettings | null }> {
  return request<{ alertSettings: AlertSettings | null }>('/auth/alert-settings');
}

export async function updateAlertSettings(settings: AlertSettings): Promise<{ alertSettings: AlertSettings }> {
  return request<{ alertSettings: AlertSettings }>('/auth/alert-settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}

// ─── Children ────────────────────────────────────────────
export async function getChildren(): Promise<Child[]> {
  return request<Child[]>('/children');
}

export async function createChild(name: string, age: number): Promise<Child> {
  return request<Child>('/children', {
    method: 'POST',
    body: JSON.stringify({ name, age }),
  });
}

export async function updateChild(id: string, data: { name?: string; age?: number }): Promise<Child> {
  return request<Child>(`/children/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteChild(id: string): Promise<void> {
  await request(`/children/${id}`, { method: 'DELETE' });
}

// ─── Devices ─────────────────────────────────────────────
export async function pairDevice(childId: string): Promise<PairDeviceResponse> {
  return request<PairDeviceResponse>('/devices/pair', {
    method: 'POST',
    body: JSON.stringify({ childId }),
  });
}

export async function getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
  return request<DeviceStatus>(`/devices/${deviceId}/status`);
}

export async function getChildDevices(childId: string): Promise<DeviceStatus[]> {
  return request<DeviceStatus[]>(`/devices/child/${childId}`);
}

export async function sendDeviceCommand(
  deviceId: string,
  command: 'lock' | 'unlock' | 'locate' | 'sync',
  params?: Record<string, unknown>,
): Promise<{ message: string; viaSocket?: boolean; viaPush?: boolean; queued?: boolean }> {
  return request(`/devices/${deviceId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command, params }),
  });
}

export async function unpairDevice(deviceId: string): Promise<{ message: string }> {
  return request(`/devices/${deviceId}`, { method: 'DELETE' });
}

// ─── Installed Apps ──────────────────────────────────────
export interface InstalledApp {
  packageName: string;
  appName: string;
  installedAt: string;
  // Optional small base64 PNG (no data: prefix), 64x64 from the child device.
  // Older devices/backends may not include it.
  iconBase64?: string | null;
}

export async function getInstalledApps(deviceId: string): Promise<InstalledApp[]> {
  return request<InstalledApp[]>(`/devices/${deviceId}/installed-apps`);
}

// ─── Rules ───────────────────────────────────────────────
export async function getRules(childId: string): Promise<Rules> {
  return request<Rules>(`/rules/${childId}/view`);
}

export async function updateScreenTime(
  childId: string,
  data: { dailyLimitMin?: number; perApp?: { appId: string; appName: string; limitMin: number }[]; schedule?: { days: string[]; startTime: string; endTime: string; blocked: boolean }[]; iosLimits?: { id: string; limitMin?: number; enabled?: boolean }[] },
): Promise<Rules> {
  return request<Rules>(`/rules/${childId}/screen-time`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateBlockedApps(
  childId: string,
  blockedApps: string[],
  extra?: { iosBlockSelected?: boolean; iosGroups?: { id: string; enabled: boolean }[] },
): Promise<Rules> {
  return request<Rules>(`/rules/${childId}/apps`, {
    method: 'PUT',
    body: JSON.stringify({ blockedApps, ...(extra ?? {}) }),
  });
}

export async function updateWebFilter(
  childId: string,
  data: { categories?: string[]; customBlock?: string[]; customAllow?: string[]; mode?: string },
): Promise<Rules> {
  return request<Rules>(`/rules/${childId}/web-filter`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Activity ────────────────────────────────────────────
export async function getActivitySummary(
  childId: string,
  period: 'day' | 'week' | 'month' = 'day',
): Promise<ActivitySummary> {
  return request<ActivitySummary>(`/activity/${childId}/summary?period=${period}`);
}

export async function getAppUsage(childId: string): Promise<AppUsageEntry[]> {
  return request<AppUsageEntry[]>(`/activity/${childId}/apps`);
}

export async function getWebActivity(childId: string): Promise<WebEntry[]> {
  return request<WebEntry[]>(`/activity/${childId}/web`);
}

export async function getLocationHistory(childId: string): Promise<LocationEntry[]> {
  return request<LocationEntry[]>(`/activity/${childId}/location`);
}

export interface DailyBreakdownEntry {
  date: string;
  screenTimeMin: number;
  blocked: number;
  webVisits: number;
}

export async function getDailyBreakdown(
  childId: string,
  days: number = 7,
): Promise<{ childId: string; days: number; breakdown: DailyBreakdownEntry[] }> {
  return request(`/activity/${childId}/daily-breakdown?days=${days}`);
}

// ─── Alerts ──────────────────────────────────────────────
export async function getAlerts(
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false,
): Promise<AlertsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(unreadOnly ? { unreadOnly: 'true' } : {}),
  });
  return request<AlertsResponse>(`/alerts?${params}`);
}

export async function markAlertRead(alertId: string): Promise<Alert> {
  return request<Alert>(`/alerts/${alertId}/read`, { method: 'PUT' });
}

export async function markAllAlertsRead(): Promise<void> {
  await request('/alerts/read-all', { method: 'PUT' });
}

// ─── Approvals ───────────────────────────────────────────
export async function getPendingApprovals(): Promise<Alert[]> {
  return request<Alert[]>('/approvals/pending');
}

export async function decideApproval(
  approvalId: string,
  action: 'approve' | 'block',
): Promise<{ message: string; alert: Alert }> {
  return request(`/approvals/${approvalId}`, {
    method: 'PUT',
    body: JSON.stringify({ action }),
  });
}

// ─── Subscription ───────────────────────────────────────
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

export async function getSubscription(): Promise<SubscriptionInfo> {
  return request<SubscriptionInfo>('/subscription');
}

export async function activateSubscription(key: string): Promise<{ message: string; subscription: any }> {
  return request('/subscription/activate', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

// ─── Geocoding ──────────────────────────────────────────
export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; cached: boolean }> {
  return request('/geocode/reverse', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
}

// ─── Geofences ──────────────────────────────────────────
export interface Geofence {
  _id: string;
  childId: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  active: boolean;
  alertCooldownMinutes: number;
  hysteresisMeters: number;
}

export async function getGeofences(childId: string): Promise<Geofence[]> {
  return request<Geofence[]>(`/geofences/${childId}`);
}

export async function createGeofence(
  childId: string,
  data: { name: string; lat: number; lng: number; radiusMeters?: number; alertOnEntry?: boolean; alertOnExit?: boolean; alertCooldownMinutes?: number; hysteresisMeters?: number },
): Promise<Geofence> {
  return request<Geofence>(`/geofences/${childId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGeofence(
  id: string,
  data: Partial<Omit<Geofence, '_id' | 'childId'>>,
): Promise<Geofence> {
  return request<Geofence>(`/geofences/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGeofence(id: string): Promise<void> {
  await request(`/geofences/${id}`, { method: 'DELETE' });
}

// ─── Push Notifications ──────────────────────────────────
export async function registerFcmToken(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await request('/auth/fcm-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function removeFcmToken(token: string): Promise<void> {
  await request('/auth/fcm-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}
