import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { Icon } from './Icon';
import { IconButton } from './Button';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  filterActive?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  onFilterPress,
  filterActive,
}: SearchBarProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.colors.backgroundElevated,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}>
        <Icon name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { color: theme.colors.text }]}
        />
        {value.length > 0 ? (
          <IconButton icon="close-circle" size={18} color={theme.colors.textMuted} onPress={() => onChangeText('')} />
        ) : null}
      </View>
      {onFilterPress ? (
        <View
          style={[
            styles.filterButton,
            {
              backgroundColor: filterActive ? theme.colors.primary : theme.colors.backgroundElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
            },
          ]}>
          <IconButton
            icon="options-outline"
            size={19}
            color={filterActive ? theme.colors.onPrimary : theme.colors.text}
            onPress={onFilterPress}
          />
        </View>
      ) : null}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: string; }) {
  const theme = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {action ? (
        <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '700' }}>{action}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  filterButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
});
