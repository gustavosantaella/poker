import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  RegisterPayload,
  UpdateProfilePayload,
} from '@/api/auth';
import { getStoredToken, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { User } from '@/api/types';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
      void logout();
    });

    (async () => {
      try {
        const stored = await getStoredToken();
        if (stored) {
          await setAuthToken(stored);
          setToken(stored);
          const me = await fetchMe();
          setUser(me);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        await logout();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    await setAuthToken(result.accessToken);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await apiRegister(payload);
    await setAuthToken(result.accessToken);
    setToken(result.accessToken);
    setUser(result.user);
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
