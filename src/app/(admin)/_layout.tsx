import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
