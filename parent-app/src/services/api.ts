import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';
import type {
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

  let response = await fetch(url, { ...options, headers });

  // If 401 and we have a refresh token, try refreshing
  if (response.status === 401 && refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
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

async function tryRefreshToken(): Promise<boolean> {
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
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ─── Auth ────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
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

export async function sendDeviceCommand(
  deviceId: string,
  command: 'lock' | 'unlock' | 'locate' | 'sync',
  params?: Record<string, unknown>,
): Promise<{ message: string }> {
  return request(`/devices/${deviceId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command, params }),
  });
}

// ─── Rules ───────────────────────────────────────────────
export async function getRules(childId: string): Promise<Rules> {
  return request<Rules>(`/rules/${childId}/view`);
}

export async function updateScreenTime(
  childId: string,
  data: { dailyLimitMin?: number; perApp?: { appId: string; appName: string; limitMin: number }[]; schedule?: { days: string[]; startTime: string; endTime: string; blocked: boolean }[] },
): Promise<Rules> {
  return request<Rules>(`/rules/${childId}/screen-time`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateBlockedApps(childId: string, blockedApps: string[]): Promise<Rules> {
  return request<Rules>(`/rules/${childId}/apps`, {
    method: 'PUT',
    body: JSON.stringify({ blockedApps }),
  });
}

export async function updateWebFilter(
  childId: string,
  data: { categories?: string[]; customBlock?: string[]; customAllow?: string[] },
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
