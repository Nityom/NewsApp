import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';

export default function RegisterScreen() {
  const theme = useAppTheme();
  const { register, loginWithGoogle, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => () => {
    const scrollNode = scrollRef.current?.getNativeScrollRef();
    if (!scrollNode) return;
    inputRef.current?.measureLayout(
      scrollNode,
      (_x, y) => scrollRef.current?.scrollTo({ y: y - 24, animated: true }),
      () => {},
    );
  };

  const handleRegister = async () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 3) nextErrors.name = 'Enter your full name';
    if (!email.includes('@')) nextErrors.email = 'Enter a valid email';
    if (phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Enter a valid phone number with country code';
    if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), phone.trim(), password);
      router.replace('/(auth)/reporter-details');
    } catch (error: any) {
      Alert.alert('Could not create account', error?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle('reporter');
      router.replace('/(auth)/reporter-details');
    } catch (error: any) {
      Alert.alert('Could not sign in with Google', error?.message ?? 'Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Join our network of education reporters and start publishing.
          </Text>

          <View style={styles.form}>
            <Input
              label="Full Name"
              leftIcon="person-outline"
              placeholder="Jane Doe"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
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
              label="Phone Number"
              leftIcon="call-outline"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
            />
            <Input
              label="Password"
              ref={passwordRef}
              leftIcon="lock-closed-outline"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
              onFocus={scrollToInput(passwordRef)}
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              ref={confirmPasswordRef}
              leftIcon="lock-closed-outline"
              placeholder="••••••••"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={scrollToInput(confirmPasswordRef)}
              error={errors.confirmPassword}
            />

            <Button label="Create Account" onPress={handleRegister} loading={submitting || isLoading} fullWidth size="lg" />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 12.5 }}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <Button
              label="Continue with Google"
              variant="outline"
              icon="logo-google"
              onPress={handleGoogleRegister}
              loading={googleSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13.5 }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13.5 }}>
              Sign In
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  changeNumber: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
});
