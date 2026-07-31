import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { useAppTheme } from '@/theme';
import { Icon, IconName } from './Icon';
import { IconButton } from './Button';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: IconName;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, leftIcon, isPassword, onFocus, onBlur, style, ...rest },
  ref,
) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(!!isPassword);

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: theme.colors.backgroundElevated,
            borderRadius: theme.radius.md,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}>
        {leftIcon ? (
          <View style={styles.leftIcon}>
            <Icon name={leftIcon} size={19} color={theme.colors.textMuted} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secure}
          style={[
            styles.input,
            { color: theme.colors.text },
            style as object,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {isPassword ? (
          <IconButton
            icon={secure ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={theme.colors.textMuted}
            onPress={() => setSecure((s) => !s)}
          />
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.helper, { color: theme.colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: theme.colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 52,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  helper: {
    fontSize: 12,
    fontWeight: '500',
  },
});
