interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const user = useState<AdminUser | null>('adminUser', () => null);
  const token = useCookie('admin_token');

  function setUser(u: AdminUser) {
    user.value = u;
  }

  function clearUser() {
    user.value = null;
    token.value = null;
  }

  function isAuthenticated(): boolean {
    return !!token.value;
  }

  return { user, token, setUser, clearUser, isAuthenticated };
}
