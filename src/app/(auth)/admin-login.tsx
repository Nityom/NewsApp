import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { palette, useAppTheme } from '@/theme';

export default function AdminLoginScreen() {
  const theme = useAppTheme();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@educationnews.com');
  const [password, setPassword] = useState('Admin@1234');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.includes('@')) nextErrors.email = 'Enter a valid email address';
    if (password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password, 'admin');
      router.replace('/(admin)/(tabs)');
    } catch (error: any) {
      Alert.alert('Could not sign in', error?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={palette.gray950} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" color="#fff" onPress={() => router.back()} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(244,180,0,0.2)' }]}>
            <Icon name="shield-checkmark" size={34} color={palette.primary400} />
          </View>
          <Text style={styles.title}>Admin Console</Text>
          <Text style={styles.subtitle}>Restricted access for editorial administrators only.</Text>

          <View style={styles.form}>
            <Input
              label="Admin Email"
              leftIcon="mail-outline"
              placeholder="admin@example.com"
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
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />
            <Button label="Sign In" onPress={handleLogin} loading={submitting || isLoading} fullWidth size="lg" />
          </View>

          <Text
            onPress={() => router.replace('/(auth)/login')}
            style={[styles.reporterLink, { color: theme.colors.primary }]}>
            Sign in as Reporter instead
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13.5,
    marginTop: 8,
    lineHeight: 19,
  },
  form: {
    gap: 16,
    marginTop: 28,
  },
  reporterLink: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
    fontWeight: '700',
  },
});
