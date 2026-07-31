import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';

export default function RegisterScreen() {
  const theme = useAppTheme();
  const { loginAsReporter, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRegister = async () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 3) nextErrors.name = 'Enter your full name';
    if (!email.includes('@')) nextErrors.email = 'Enter a valid email';
    if (phone.trim().length < 10) nextErrors.phone = 'Enter a valid phone number';
    if (password.length < 6) nextErrors.password = 'Minimum 6 characters required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await loginAsReporter();
    router.replace('/(reporter)/(tabs)');
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
              leftIcon="lock-closed-outline"
              placeholder="Create a password"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              hint="Use at least 6 characters"
            />

            <Button label="Create Account" onPress={handleRegister} loading={isLoading} fullWidth size="lg" />
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
