import { ReactNode } from 'react';
import {
    ActivityIndicator,
    Pressable,
    PressableProps,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useAppTheme } from '@/theme';
import { Icon, IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  ...pressableProps
}: ButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;

  const heights: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 56 };
  const fontSizes: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 16 };

  const palettes: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: theme.colors.primary, text: theme.colors.onPrimary },
    secondary: { bg: theme.colors.primaryMuted, text: theme.colors.primary },
    outline: { bg: 'transparent', text: theme.colors.text, border: theme.colors.borderStrong },
    ghost: { bg: 'transparent', text: theme.colors.primary },
    danger: { bg: theme.colors.danger, text: theme.colors.textInverse },
  };
  const p = palettes[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.lg,
        },
      ]}
      {...pressableProps}>
      {loading ? (
        <ActivityIndicator color={p.text} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' ? <Icon name={icon} size={18} color={p.text} /> : null}
          <Text
            style={[
              styles.label,
              { color: p.text, fontSize: fontSizes[size] },
            ]}
            numberOfLines={1}>
            {label}
          </Text>
          {icon && iconPosition === 'right' ? <Icon name={icon} size={18} color={p.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}

interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: IconName;
  size?: number;
  variant?: 'plain' | 'filled';
  color?: string;
  badge?: number;
}

export function IconButton({
  icon,
  size = 22,
  variant = 'plain',
  color,
  badge,
  ...pressableProps
}: IconButtonProps) {
  const theme = useAppTheme();
  const iconColor = color ?? theme.colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: variant === 'filled' ? theme.colors.backgroundSubtle : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
      hitSlop={8}
      {...pressableProps}>
      <Icon name={icon} size={size} color={iconColor} />
      {badge ? (
        <View style={[styles.iconButtonBadge, { backgroundColor: theme.colors.danger }]}>
          <Text style={styles.iconButtonBadgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
