import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types';
import * as api from '../services/api';
import { connectSocket, disconnectSocket, setOnAuthExpired } from '../services/socket';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/notifications';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<{ message: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Try to load existing tokens on mount
    (async () => {
      try {
        await api.loadTokens();
        const token = api.getAccessToken();
        if (token) {
          // Verify token and fetch user profile
          const user = await api.getMe();
          setState({ user, isLoading: false, isAuthenticated: true });
          connectSocket();
          registerForPushNotifications();
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch {
        await api.clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
    connectSocket();
    registerForPushNotifications();
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, phone: string) => {
    const data = await api.register(email, password, name, phone);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
    connectSocket();
    registerForPushNotifications();
  }, []);

  const logout = useCallback(async () => {
    await unregisterPushNotifications();
    disconnectSocket();
    await api.logout();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  // When server signals auth:expired or auth:revoked, force logout
  useEffect(() => {
    setOnAuthExpired(() => {
      logout();
    });
    return () => { setOnAuthExpired(null); };
  }, [logout]);

  const verifyEmail = useCallback(async (code: string) => {
    await api.verifyEmail(code);
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, emailVerified: true } : null,
    }));
  }, []);

  const resendVerification = useCallback(async () => {
    return api.resendVerification();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await api.getMe();
      setState((prev) => ({ ...prev, user }));
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, verifyEmail, resendVerification, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
