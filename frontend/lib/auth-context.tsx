'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from './types';
import { ApiError, api } from './api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    let mounted = true;

    const initAuth = async () => {
      try {
        const token = window.localStorage.getItem('token');
        if (token) {
          const userData = await api.auth.getMe(controller.signal);
          if (mounted) setUser(userData);
        }
      } catch (error) {
        console.error('Unable to restore the authentication session:', error);
        if (error instanceof ApiError && error.status === 401) {
          try {
            window.localStorage.removeItem('token');
          } catch (storageError) {
            console.error('Unable to clear the stored authentication token:', storageError);
          }
        }
      } finally {
        window.clearTimeout(timeout);
        if (mounted) setLoading(false);
      }
    };
    void initAuth();

    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  const login = useCallback(async (token: string) => {
    window.localStorage.setItem('token', token);
    try {
      const userData = await api.auth.getMe();
      setUser(userData);
      router.push(`/${userData.role}`);
    } catch (error) {
      window.localStorage.removeItem('token');
      setUser(null);
      throw error;
    }
  }, [router]);

  const logout = useCallback(() => {
    window.localStorage.removeItem('token');
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
