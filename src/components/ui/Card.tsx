import { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

import { useAppTheme } from '@/theme';

interface CardProps extends ViewProps {
  children: ReactNode;
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ children, style, elevated = true, padded = true, ...rest }: CardProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.md : 0,
          ...(elevated ? theme.shadow('sm') : {}),
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
