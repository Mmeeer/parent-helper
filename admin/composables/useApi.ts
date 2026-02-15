export function useApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl;
  const token = useCookie('admin_token');

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`;
    }

    const res = await $fetch<T>(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
    return res;
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

    // Admin endpoints
    async getUsers(page = 1, limit = 20, search = '') {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.append('search', search);
      return request<{ users: any[]; total: number; page: number; totalPages: number }>(
        `/admin/users?${params}`,
      );
    },

    async getAnalytics() {
      return request<{
        totalUsers: number;
        activeUsers: number;
        totalChildren: number;
        totalDevices: number;
        planDistribution: Record<string, number>;
        recentRegistrations: number;
      }>('/admin/analytics');
    },

    async getFilters() {
      return request<{ categories: string[]; domains: { domain: string; category: string }[] }>(
        '/admin/filters',
      );
    },

    async updateFilter(domain: string, category: string) {
      return request('/admin/filters', {
        method: 'PUT',
        body: JSON.stringify({ domain, category }),
      });
    },

    async deleteFilter(domain: string) {
      return request(`/admin/filters/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
    },

    async getUserDetail(userId: string) {
      return request<any>(`/admin/users/${userId}`);
    },

    async suspendUser(userId: string) {
      return request(`/admin/users/${userId}/suspend`, { method: 'PUT' });
    },
  };
}
