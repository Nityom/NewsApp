import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';

const appLogo = require('../../../assets/images/app_logo.png');

export default function LoginScreen() {
  const theme = useAppTheme();
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => () => {
    const scrollNode = scrollRef.current?.getNativeScrollRef();
    if (!scrollNode) return;
    inputRef.current?.measureLayout(
      scrollNode,
      (_x, y) => scrollRef.current?.scrollTo({ y: y - 24, animated: true }),
      () => {},
    );
  };

  const handleLogin = async () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.includes('@')) nextErrors.email = 'Enter a valid email address';
    if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password, 'reporter');
      router.replace('/(reporter)/(tabs)');
    } catch (error: any) {
      Alert.alert('Could not sign in', error?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle('reporter');
      router.replace('/(reporter)/(tabs)');
    } catch (error: any) {
      Alert.alert('Could not sign in with Google', error?.message ?? 'Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoCircle}>
            <Image source={appLogo} style={styles.logoImage} contentFit="contain" />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Sign in with your email to continue reporting education news.
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
              ref={passwordRef}
              leftIcon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={scrollToInput(passwordRef)}
              error={errors.password}
            />
            <Link
              href="/(auth)/forgot-password"
              style={[styles.forgot, { color: theme.colors.primary, alignSelf: 'flex-end' }]}>
              Forgot password?
            </Link>
            <Button label="Sign In" onPress={handleLogin} loading={submitting || isLoading} fullWidth size="lg" />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 12.5 }}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <Button
              label="Continue with Google"
              variant="outline"
              icon="logo-google"
              onPress={handleGoogleLogin}
              loading={googleSubmitting}
              fullWidth
              size="lg"
            />
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
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
