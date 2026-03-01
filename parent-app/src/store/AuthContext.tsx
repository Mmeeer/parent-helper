import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types';
import * as api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
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
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await api.register(email, password, name);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
    connectSocket();
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    await api.logout();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
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
