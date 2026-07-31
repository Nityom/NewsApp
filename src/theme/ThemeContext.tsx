import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, ThemeColors, ThemeMode } from './colors';
import { radius, shadow, spacing } from './spacing';
import { typography } from './typography';

export type AppTheme = {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: (level: 'sm' | 'md' | 'lg') => ReturnType<typeof shadow>;
};

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  overrideMode: ThemeMode | null;
  setOverrideMode: (mode: ThemeMode | null) => void;
};

function buildTheme(mode: ThemeMode): AppTheme {
  const colors: ThemeColors = Colors[mode];
  return {
    mode,
    colors,
    spacing,
    radius,
    typography,
    shadow: (level) => shadow(level, colors.shadow),
  };
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [overrideMode, setOverrideMode] = useState<ThemeMode | null>(null);

  const mode: ThemeMode = overrideMode ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => buildTheme(mode), [mode]);

  const value = useMemo(
    () => ({ theme, mode, overrideMode, setOverrideMode }),
    [theme, mode, overrideMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return ctx.theme;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within an AppThemeProvider');
  }
  return { mode: ctx.mode, overrideMode: ctx.overrideMode, setOverrideMode: ctx.setOverrideMode };
}
