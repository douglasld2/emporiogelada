import React, { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser, useLogin as useLoginMutation, useLogout as useLogoutMutation, useRegister as useRegisterMutation } from './api';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const [, navigate] = useLocation();
  
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const registerMutation = useRegisterMutation();

  const login = async (email: string, password: string) => {
    try {
      const user = await loginMutation.mutateAsync({ email, password });
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role?: string) => {
    try {
      await registerMutation.mutateAsync({ email, password, name, role });
      navigate('/');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate('/');
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider');
  }
  return context;
}
