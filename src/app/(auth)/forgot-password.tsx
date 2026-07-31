import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAppTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError(undefined);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        {sent ? (
          <View style={styles.centered}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.successMuted }]}>
              <Icon name="checkmark-circle" size={40} color={theme.colors.success} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              We&apos;ve sent password reset instructions to {email}.
            </Text>
            <View style={{ marginTop: 28, alignSelf: 'stretch' }}>
              <Button label="Back to Sign In" onPress={() => router.replace('/(auth)/login')} fullWidth size="lg" />
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryMuted }]}>
              <Icon name="key-outline" size={34} color={theme.colors.primary} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Enter your registered email and we&apos;ll send you a link to reset your password.
            </Text>

            <View style={styles.form}>
              <Input
                label="Email"
                leftIcon="mail-outline"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={error}
              />
              <Button label="Send Reset Link" onPress={handleSend} loading={loading} fullWidth size="lg" />
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  centered: {
    alignItems: 'center',
    marginTop: 60,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'left',
  },
  form: {
    gap: 16,
    marginTop: 24,
  },
});
