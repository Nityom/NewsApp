import { Platform } from 'react-native';

export const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    semibold: 'sans-serif-medium',
    bold: 'sans-serif',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
})!;

export const typography = {
  displayLg: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const },
  displayMd: { fontSize: 28, lineHeight: 35, fontWeight: '700' as const },
  h1: { fontSize: 24, lineHeight: 31, fontWeight: '700' as const },
  h2: { fontSize: 20, lineHeight: 27, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
} as const;

export type TypographyVariant = keyof typeof typography;
