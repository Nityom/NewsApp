import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.backgroundSubtle,
          borderRadius: theme.radius.full,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <Text
        style={{
          color: selected ? theme.colors.onPrimary : theme.colors.textSecondary,
          fontSize: 13,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
