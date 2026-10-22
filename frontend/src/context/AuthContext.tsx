/**
 * ============================================================================
 * MODULE: Authentication State Context & Session Provider (AuthContext.tsx)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Central React Context managing authenticated user sessions, JWT token storage,
 * role boolean flags (isAdmin, isDeptAdmin, isFaculty, isStudent), login/registration
 * state transitions, and live profile updates.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Persists user profile and JWT tokens in browser `localStorage`.
 * 2. On app load, validates existing session via `api.auth.me()` and hydrates state.
 * 3. Exposes helper methods:
 *    - `login()`: Authenticates credentials and stores tokens.
 *    - `register()`: Registers account and initializes session.
 *    - `logout()`: Clears local state and server-side refresh tokens.
 *    - `refreshProfile()`: Re-fetches latest profile data from server.
 *    - `updateCurrentUser()`: Updates avatar, name, and profile details reactively.
 *    - `hasRole()`: Checks if current user matches any target role.
 * 4. Provides boolean role helpers: `isAdmin`, `isDeptAdmin`, `isFaculty`, `isStudent`.
 * ============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; role?: string; department_id?: string; employee_id?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateCurrentUser: (updatedUser: User) => void;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isDeptAdmin: boolean;
  isFaculty: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('iudwas_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('iudwas_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      if (localStorage.getItem('iudwas_token')) {
        const res = await api.auth.me();
        setUser(res.data.user);
        localStorage.setItem('iudwas_user', JSON.stringify(res.data.user));
      }
    } catch {
      // If profile fetch fails, user might be invalid
      setUser(null);
      setToken(null);
      localStorage.removeItem('iudwas_token');
      localStorage.removeItem('iudwas_refresh_token');
      localStorage.removeItem('iudwas_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.auth.login(credentials);
    const { user: authUser, accessToken, refreshToken } = res.data;
    localStorage.setItem('iudwas_token', accessToken);
    localStorage.setItem('iudwas_refresh_token', refreshToken);
    localStorage.setItem('iudwas_user', JSON.stringify(authUser));
    setToken(accessToken);
    setUser(authUser);
  };

  const register = async (data: any) => {
    const res = await api.auth.register(data);
    const { user: authUser, accessToken, refreshToken } = res.data;
    localStorage.setItem('iudwas_token', accessToken);
    localStorage.setItem('iudwas_refresh_token', refreshToken);
    localStorage.setItem('iudwas_user', JSON.stringify(authUser));
    setToken(accessToken);
    setUser(authUser);
  };

  const logout = async () => {
    const rToken = localStorage.getItem('iudwas_refresh_token');
    try {
      await api.auth.logout(rToken || undefined);
    } catch {
      // Ignore logout api error
    } finally {
      localStorage.removeItem('iudwas_token');
      localStorage.removeItem('iudwas_refresh_token');
      localStorage.removeItem('iudwas_user');
      setToken(null);
      setUser(null);
    }
  };

  const updateCurrentUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('iudwas_user', JSON.stringify(updatedUser));
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isDeptAdmin = user?.role === 'DEPT_ADMIN';
  const isFaculty = user?.role === 'FACULTY';
  const isStudent = user?.role === 'STUDENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        updateCurrentUser,
        hasRole,
        isAdmin,
        isDeptAdmin,
        isFaculty,
        isStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
