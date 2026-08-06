'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { setupFetchInterceptor } from './fetch-interceptor';

// Setup fetch interceptor for Tauri environment
setupFetchInterceptor();

interface User {
  id: string;
  email: string; // Stored as username but keep field names matching database
  fullName: string;
  businessName: string;
  location: string;
  currentWeek: string;
  photoUrl: string;
  role?: 'admin' | 'agent';
  adminId?: string;
}

export interface OnboardingPayload {
  motto?: string;
  operationPeriodMode?: 'weeks' | 'months';
  revenueTarget?: number;
  openingCash?: number;
  initialProducts?: Array<{
    name: string;
    category?: string;
    price: number;
    buyingPrice?: number;
    shopStock?: number;
    warehouseStock?: number;
  }>;
  initialDebtors?: Array<{
    customerName: string;
    total: number;
    dueDate?: string;
    note?: string;
  }>;
  initialCreditors?: Array<{
    supplierName: string;
    supplierContact?: string;
    productName: string;
    quantity?: number;
    totalAmount: number;
    dueDate?: string;
  }>;
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, role?: 'admin' | 'agent') => Promise<void>;
  signup: (
    username: string, 
    password: string, 
    fullName: string, 
    businessName: string, 
    location: string,
    onboardingData?: OnboardingPayload
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token, user, and theme from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    const savedTheme = localStorage.getItem('upshop_theme') || 'theme-1';
    
    document.documentElement.className = savedTheme;
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (username: string, password: string, role: 'admin' | 'agent' = 'admin') => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password, role })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
  };

  const signup = async (
    username: string, 
    password: string, 
    fullName: string, 
    businessName: string, 
    location: string,
    onboardingData?: OnboardingPayload
  ) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: username, 
        password, 
        fullName, 
        businessName, 
        location,
        ...(onboardingData || {})
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useUser() {
  const { user, token, loading } = useAuth();
  return { user, loading };
}
