import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';

interface ScreenContainerProps {
  children: ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  backgroundColor?: string;
}

export function ScreenContainer({
  children,
  edges = ['top', 'left', 'right'],
  style,
  backgroundColor,
}: ScreenContainerProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.container,
        { backgroundColor: backgroundColor ?? theme.colors.background },
        style,
      ]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
