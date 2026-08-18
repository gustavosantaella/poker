import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  UpdateProfilePayload,
} from '@/api/auth';
import { getStoredToken, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { User } from '@/api/types';
import { log } from '@/utils/logger';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Gestiona la sesion: token en AsyncStorage + usuario actual. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      log.warn('Unauthorized response received - logging out');
      void logout();
    });

    (async () => {
      try {
        const stored = await getStoredToken();
        if (stored) {
          log.info('Restoring session from stored token');
          await setAuthToken(stored);
          setToken(stored);
          const me = await fetchMe();
          setUser(me);
          log.info(`Session restored for ${me.email}`);
        } else {
          log.info('No stored token - starting signed out');
        }
      } catch (error) {
        log.error('Failed to restore session', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    log.info(`Login attempt: ${email}`);
    try {
      const result = await apiLogin(email, password);
      await setAuthToken(result.accessToken);
      setToken(result.accessToken);
      setUser(result.user);
      log.info(`Login success: ${email} (id=${result.user.id})`);
    } catch (error) {
      log.error(`Login failed: ${email}`, error);
      throw error;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, inviteCode?: string) => {
    log.info(`Register attempt: ${email}`);
    try {
      const result = await apiRegister(name, email, password, inviteCode);
      await setAuthToken(result.accessToken);
      setToken(result.accessToken);
      setUser(result.user);
      log.info(`Register success: ${email} (id=${result.user.id})`);
    } catch (error) {
      log.error(`Register failed: ${email}`, error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await apiUpdateProfile(payload);
    setUser(updated);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, token, isLoading, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}