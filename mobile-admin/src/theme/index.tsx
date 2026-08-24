import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ColorTokens, palette } from './colors';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: ColorTokens;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = 'PokerPros.themeMode';
const ThemeContext = createContext<Theme | null>(null);

/**
 * Provee los colores activos (claro/oscuro/sistema) a toda la app.
 * La preferencia se persiste en AsyncStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = (isDark ? palette.dark : palette.light) as ColorTokens;

  const value = useMemo<Theme>(
    () => ({
      colors,
      isDark,
      mode,
      setMode: (next) => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      },
      toggle: () => setModeState(isDark ? 'light' : 'dark'),
    }),
    [colors, isDark, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}