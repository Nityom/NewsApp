import { Stack } from 'expo-router';

export default function ReporterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-article" options={{ presentation: 'modal' }} />
      <Stack.Screen name="article/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="payment" />
    </Stack>
  );
}
