import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { loginAsReporter, isLoading } = useAuth();
  const [email, setEmail] = useState('ananya.sharma@enr.app');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    const nextErrors: typeof errors = {};
    if (!email.includes('@')) nextErrors.email = 'Enter a valid email address';
    if (password.length < 4) nextErrors.password = 'Password must be at least 4 characters';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await loginAsReporter();
    router.replace('/(reporter)/(tabs)');
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.logoCircle, { backgroundColor: theme.colors.primaryMuted }]}>
            <Icon name="newspaper" size={32} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Sign in to continue reporting education news.
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
              error={errors.email}
            />
            <Input
              label="Password"
              leftIcon="lock-closed-outline"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />
            <Link href="/(auth)/forgot-password" style={[styles.forgot, { color: theme.colors.primary }]}>
              Forgot password?
            </Link>

            <Button label="Sign In" onPress={handleLogin} loading={isLoading} fullWidth size="lg" />
          </View>

          <View style={styles.footerRow}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13.5 }}>
              Don&apos;t have an account?{' '}
            </Text>
            <Link href="/(auth)/register" style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13.5 }}>
              Register
            </Link>
          </View>

          <Link href="/(auth)/admin-login" style={[styles.adminLink, { color: theme.colors.textMuted }]}>
            Sign in as Admin
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 28,
  },
  form: {
    gap: 16,
  },
  forgot: {
    alignSelf: 'flex-end',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  adminLink: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 13,
    fontWeight: '600',
  },
});
