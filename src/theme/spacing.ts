export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
} as const;

export type ShadowLevel = 'sm' | 'md' | 'lg';

export function shadow(level: ShadowLevel, color: string) {
  const map = {
    sm: { offset: 2, radius: 6, opacity: 0.08, elevation: 2 },
    md: { offset: 4, radius: 12, opacity: 0.1, elevation: 5 },
    lg: { offset: 8, radius: 20, opacity: 0.14, elevation: 10 },
  } as const;
  const cfg = map[level];
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: cfg.offset },
    shadowOpacity: cfg.opacity,
    shadowRadius: cfg.radius,
    elevation: cfg.elevation,
  };
}
