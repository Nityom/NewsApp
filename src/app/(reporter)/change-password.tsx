import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAppTheme } from '@/theme';

export default function ChangePasswordScreen() {
  const theme = useAppTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (current.length < 4) nextErrors.current = 'Enter your current password';
    if (next.length < 6) nextErrors.next = 'Minimum 6 characters required';
    if (confirm !== next) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }, 900);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Choose a strong password you haven&apos;t used before.
        </Text>

        <View style={styles.form}>
          <Input label="Current Password" leftIcon="lock-closed-outline" isPassword value={current} onChangeText={setCurrent} error={errors.current} />
          <Input label="New Password" leftIcon="key-outline" isPassword value={next} onChangeText={setNext} error={errors.next} />
          <Input label="Confirm New Password" leftIcon="key-outline" isPassword value={confirm} onChangeText={setConfirm} error={errors.confirm} />

          <Button label="Update Password" onPress={handleSubmit} loading={loading} fullWidth size="lg" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
});
