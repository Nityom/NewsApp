/** Brand palette and semantic color tokens for light/dark modes. */

export const palette = {
  primary50: '#EEF2FF',
  primary100: '#E0E7FF',
  primary200: '#C7D2FE',
  primary300: '#A5B4FC',
  primary400: '#818CF8',
  primary500: '#6366F1',
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary800: '#3730A3',
  primary900: '#312E81',

  accent500: '#F59E0B',
  accent600: '#D97706',

  success50: '#ECFDF5',
  success500: '#10B981',
  success600: '#059669',

  warning50: '#FFFBEB',
  warning500: '#F59E0B',
  warning600: '#D97706',

  danger50: '#FEF2F2',
  danger500: '#EF4444',
  danger600: '#DC2626',

  info50: '#EFF6FF',
  info500: '#3B82F6',
  info600: '#2563EB',

  gray0: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  gray950: '#0B0F19',
  black: '#000000',
} as const;

export const Colors = {
  light: {
    background: palette.gray50,
    backgroundElevated: palette.gray0,
    backgroundSubtle: palette.gray100,
    card: palette.gray0,
    border: palette.gray200,
    borderStrong: palette.gray300,

    text: palette.gray900,
    textSecondary: palette.gray600,
    textMuted: palette.gray400,
    textInverse: palette.gray0,

    primary: palette.primary600,
    primaryMuted: palette.primary50,
    onPrimary: palette.gray0,

    accent: palette.accent500,

    success: palette.success600,
    successMuted: palette.success50,
    warning: palette.warning600,
    warningMuted: palette.warning50,
    danger: palette.danger600,
    dangerMuted: palette.danger50,
    info: palette.info600,
    infoMuted: palette.info50,

    tabBarBackground: palette.gray0,
    tabBarInactive: palette.gray400,

    overlay: 'rgba(15, 17, 21, 0.5)',
    skeleton: palette.gray200,
    shadow: palette.gray900,
  },
  dark: {
    background: palette.gray950,
    backgroundElevated: palette.gray900,
    backgroundSubtle: palette.gray800,
    card: palette.gray900,
    border: palette.gray800,
    borderStrong: palette.gray700,

    text: palette.gray50,
    textSecondary: palette.gray300,
    textMuted: palette.gray500,
    textInverse: palette.gray900,

    primary: palette.primary400,
    primaryMuted: 'rgba(99, 102, 241, 0.16)',
    onPrimary: palette.gray950,

    accent: palette.accent500,

    success: palette.success500,
    successMuted: 'rgba(16, 185, 129, 0.16)',
    warning: palette.warning500,
    warningMuted: 'rgba(245, 158, 11, 0.16)',
    danger: palette.danger500,
    dangerMuted: 'rgba(239, 68, 68, 0.16)',
    info: palette.info500,
    infoMuted: 'rgba(59, 130, 246, 0.16)',

    tabBarBackground: palette.gray900,
    tabBarInactive: palette.gray500,

    overlay: 'rgba(0, 0, 0, 0.65)',
    skeleton: palette.gray800,
    shadow: palette.black,
  },
} as const;

export type ThemeMode = keyof typeof Colors;
export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColorKey = keyof ThemeColors;
