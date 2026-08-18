import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user?.role !== 'admin') return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-article" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reporter/[id]" />
      <Stack.Screen name="article/[id]" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help-support" />
      <Stack.Screen name="terms-privacy" />
    </Stack>
  );
}
