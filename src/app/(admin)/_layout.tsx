import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useNotifications } from '@/context/NotificationsContext';

function NewReporterRequestAlerts() {
  const { notifications } = useNotifications();
  // Seeded with whatever's already there on mount so we only alert for requests that arrive
  // while the admin is actively using the app, not the whole unread backlog.
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const joinRequests = notifications.filter((n) => n.audience === 'admin' && n.type === 'reporter_joined');

    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(joinRequests.map((n) => n.id));
      return;
    }

    for (const notification of joinRequests) {
      if (seenIdsRef.current.has(notification.id)) continue;
      seenIdsRef.current.add(notification.id);
      Alert.alert(notification.title, notification.message, [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'View',
          onPress: () =>
            notification.reporterId
              ? router.push(`/(admin)/reporter/${notification.reporterId}`)
              : router.push('/(admin)/(tabs)/reporters'),
        },
      ]);
    }
  }, [notifications]);

  return null;
}

export default function AdminLayout() {
  return (
    <>
      <NewReporterRequestAlerts />
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
    </>
  );
}
