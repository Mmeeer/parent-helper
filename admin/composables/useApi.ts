export function useApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl;
  const token = useCookie('admin_token');

  async function request<T>(path: string, options: Record<string, any> = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`;
    }

    try {
      const res = await $fetch<T>(`${baseUrl}${path}`, {
        ...options,
        headers,
      });
      return res;
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        token.value = null;
        navigateTo('/login');
      }
      throw err;
    }
  }

  return {
    // Auth
    async login(email: string, password: string) {
      const data = await request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      token.value = data.accessToken;
      return data;
    },

    logout() {
      token.value = null;
      navigateTo('/login');
    },

    isAuthenticated() {
      return !!token.value;
    },

    // Dashboard
    async getDashboard() {
      return request<{
        stats: { totalUsers: number; activeUsers: number; totalChildren: number; totalDevices: number; onlineDevices: number; alertsToday: number; recentRegistrations: number };
        planDistribution: { free: number; subscribed: number; totalKeys: number; activeKeys: number };
        alertsByType: Record<string, number>;
        recentAlerts: any[];
        serverTime: string;
        uptime: number;
      }>('/admin/dashboard');
    },

    // Users
    async getUsers(page = 1, limit = 20, params: { search?: string; plan?: string; sortBy?: string; sortOrder?: string } = {}) {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (params.search) qs.append('search', params.search);
      if (params.plan) qs.append('plan', params.plan);
      if (params.sortBy) qs.append('sortBy', params.sortBy);
      if (params.sortOrder) qs.append('sortOrder', params.sortOrder);
      return request<{ users: any[]; total: number; page: number; totalPages: number }>(`/admin/users?${qs}`);
    },

    async getUserDetail(userId: string) {
      return request<any>(`/admin/users/${userId}`);
    },

    async getUserRules(userId: string) {
      return request<{ rules: any[] }>(`/admin/users/${userId}/rules`);
    },

    async getUserActivity(userId: string, days = 7) {
      return request<{ logs: any[]; children: any[] }>(`/admin/users/${userId}/activity?days=${days}`);
    },

    async getUserAlerts(userId: string, page = 1, limit = 20) {
      return request<{ alerts: any[]; total: number; page: number; totalPages: number }>(
        `/admin/users/${userId}/alerts?page=${page}&limit=${limit}`,
      );
    },

    async suspendUser(userId: string) {
      return request(`/admin/users/${userId}/suspend`, { method: 'PUT' });
    },

    async unsuspendUser(userId: string) {
      return request(`/admin/users/${userId}/unsuspend`, { method: 'PUT' });
    },

    async verifyUserEmail(userId: string) {
      return request(`/admin/users/${userId}/verify-email`, { method: 'PUT' });
    },

    // Analytics
    async getAnalytics() {
      return request<{
        totalUsers: number; activeUsers: number; totalChildren: number; totalDevices: number;
        subscriptions: { subscribed: number; totalKeys: number; activeKeys: number };
        recentRegistrations: number;
      }>('/admin/analytics');
    },

    // Activity monitoring
    async getActivitySummary(period = '7d') {
      return request<{
        stats: { totalLogs: number; totalAppHours: number; totalWebVisits: number; totalBlocked: number };
        topApps: any[];
        topDomains: any[];
        topBlocked: any[];
      }>(`/admin/activity/summary?period=${period}`);
    },

    // Alerts
    async getAlerts(params: { page?: number; limit?: number; type?: string; read?: string; period?: string } = {}) {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', String(params.page));
      if (params.limit) qs.append('limit', String(params.limit));
      if (params.type) qs.append('type', params.type);
      if (params.read) qs.append('read', params.read);
      if (params.period) qs.append('period', params.period);
      return request<{ alerts: any[]; total: number; page: number; totalPages: number }>(`/admin/alerts?${qs}`);
    },

    async getAlertsSummary(period = '14d') {
      return request<{
        totalToday: number; totalUnread: number;
        byType: Record<string, number>; trend: { date: string; count: number }[];
        topUsers: any[];
      }>(`/admin/alerts/summary?period=${period}`);
    },

    // System health
    async getSystemHealth() {
      return request<{
        devices: { total: number; online: number; offline: number };
        alerts: { today: number; byType: Record<string, number> };
        activity: { logsToday: number };
        users: { newThisWeek: number };
        serverTime: string;
        uptime: number;
      }>('/admin/health');
    },

    // Content filters
    async getFilters() {
      return request<{ categories: string[]; domains: { domain: string; category: string }[] }>('/admin/filters');
    },

    async updateFilter(domain: string, category: string) {
      return request('/admin/filters', { method: 'PUT', body: JSON.stringify({ domain, category }) });
    },

    async deleteFilter(domain: string) {
      return request(`/admin/filters/${encodeURIComponent(domain)}`, { method: 'DELETE' });
    },

    // Subscription keys
    async getKeys(page = 1, limit = 20, status = '') {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) qs.append('status', status);
      return request<{ keys: any[]; total: number; page: number; totalPages: number }>(`/admin/keys?${qs}`);
    },

    async createKey(maxKids: number, durationMonths: number, note = '') {
      return request<any>('/admin/keys', { method: 'POST', body: JSON.stringify({ maxKids, durationMonths, note }) });
    },

    async updateKey(keyId: string, data: { maxKids?: number; note?: string }) {
      return request<any>(`/admin/keys/${keyId}`, { method: 'PUT', body: JSON.stringify(data) });
    },

    async extendKey(keyId: string, months: number) {
      return request<any>(`/admin/keys/${keyId}/extend`, { method: 'PUT', body: JSON.stringify({ months }) });
    },

    async deleteKey(keyId: string) {
      return request(`/admin/keys/${keyId}`, { method: 'DELETE' });
    },

    // Account deletions
    async getDeletionsPending(page = 1, limit = 20) {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      return request<{ users: any[]; total: number; page: number; totalPages: number }>(`/admin/deletions?${qs}`);
    },

    async cancelDeletion(userId: string) {
      return request(`/admin/deletions/${userId}/cancel`, { method: 'PUT' });
    },

    async purgeDeletions() {
      return request<{ message: string; purged: number }>('/admin/deletions/purge', { method: 'POST' });
    },
  };
}
