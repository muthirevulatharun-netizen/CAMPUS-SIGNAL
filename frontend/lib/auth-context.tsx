'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from './types';
import { api } from './api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = window.localStorage.getItem('token');
        if (token) {
          const userData = await api.auth.getMe();
          setUser(userData);
        }
      } catch (error) {
        console.error('Unable to restore the authentication session:', error);
        try {
          window.localStorage.removeItem('token');
        } catch (storageError) {
          console.error('Unable to clear the stored authentication token:', storageError);
        }
      } finally {
        setLoading(false);
      }
    };
    void initAuth();
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    api.auth.getMe().then(userData => {
      setUser(userData);
      router.push(`/${userData.role}`);
    }).catch(console.error);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
