import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useNotifications } from '@/context/NotificationsContext';

function AdminActionAlerts() {
  const { notifications, markRead } = useNotifications();
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const actionableNotifications = notifications.filter(
      (notification) =>
        notification.audience === 'admin' &&
        (notification.type === 'reporter_joined' ||
          notification.type === 'payment' ||
          (notification.type === 'system' && notification.title === 'Payment Marked as Done')),
    );

    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(
        actionableNotifications.filter((notification) => notification.isRead).map((notification) => notification.id),
      );
    }

    for (const notification of actionableNotifications) {
      if (notification.isRead || seenIdsRef.current.has(notification.id)) continue;
      seenIdsRef.current.add(notification.id);
      Alert.alert(notification.title, notification.message, [
        { text: 'Dismiss', style: 'cancel', onPress: () => markRead(notification.id) },
        {
          text: 'View',
          onPress: () => {
            markRead(notification.id);
            return notification.reporterId
              ? router.push(`/(admin)/reporter/${notification.reporterId}`)
              : router.push('/(admin)/(tabs)/reporters');
          },
        },
      ]);
    }
  }, [markRead, notifications]);

  return null;
}

export default function AdminLayout() {
  return (
    <>
      <AdminActionAlerts />
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
