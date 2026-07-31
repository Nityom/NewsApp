import { StyleSheet } from 'react-native';
import { Pressable } from 'react-native';

import { useAppTheme } from '@/theme';
import { Icon, IconName } from './Icon';

interface FABProps {
  icon?: IconName;
  onPress: () => void;
  bottomOffset?: number;
}

export function FAB({ icon = 'add', onPress, bottomOffset = 24 }: FABProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.colors.primary,
          bottom: bottomOffset,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          ...theme.shadow('lg'),
        },
      ]}>
      <Icon name={icon} size={26} color={theme.colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
