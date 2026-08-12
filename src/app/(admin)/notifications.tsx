import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useNotifications } from '@/context/NotificationsContext';
import { useAppTheme } from '@/theme';
import type { NotificationType } from '@/types/models';

const iconMap: Record<NotificationType, IconName> = {
  article_approved: 'checkmark-circle',
  article_rejected: 'close-circle',
  article_pending: 'time',
  payment: 'cash',
  system: 'information-circle',
  reporter_joined: 'person-add',
};

const toneMap: Record<NotificationType, 'success' | 'danger' | 'warning' | 'primary' | 'info'> = {
  article_approved: 'success',
  article_rejected: 'danger',
  article_pending: 'warning',
  payment: 'primary',
  system: 'info',
  reporter_joined: 'primary',
};

function timeAgo(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminNotificationsScreen() {
  const theme = useAppTheme();
  const { getForAudience, isLoading, loadError, markAllRead, testAdminNotification } = useNotifications();
  const [testing, setTesting] = useState(false);
  const notifications = getForAudience('admin');
  const unreadIds = useMemo(
    () => notifications.filter((notification) => !notification.isRead).map((notification) => notification.id),
    [notifications],
  );

  useEffect(() => {
    if (unreadIds.length > 0) markAllRead(unreadIds).catch(() => {});
  }, [markAllRead, unreadIds]);

  const runNotificationTest = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const recipientCount = await testAdminNotification();
      Alert.alert(
        'Notification Test Sent',
        `The panel record was saved and Expo accepted the push for ${recipientCount} registered admin device${recipientCount === 1 ? '' : 's'}.`,
      );
    } catch (error) {
      Alert.alert(
        'Push Test Failed',
        `The notification panel record was saved, but remote push failed. ${error instanceof Error ? error.message : 'Please check notification permission and try again.'}`,
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
        <IconButton
          icon="paper-plane-outline"
          accessibilityLabel="Test admin notifications"
          disabled={testing}
          onPress={runNotificationTest}
        />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const tone = toneMap[item.type];
          return (
            <Pressable
              onPress={() => {
                if (item.articleId) {
                  router.push(`/(admin)/article/${item.articleId}`);
                } else if (item.reporterId) {
                  router.push(`/(admin)/reporter/${item.reporterId}`);
                }
              }}
              style={[
                styles.row,
                {
                  backgroundColor: item.isRead ? theme.colors.card : theme.colors.primaryMuted,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                },
              ]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.colors[`${tone}Muted`] }]}>
                <Icon name={iconMap[item.type]} size={19} color={theme.colors[tone]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.notifMessage, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {item.message}
                </Text>
                {item.pushStatus ? (
                  <Text
                    style={[
                      styles.deliveryStatus,
                      { color: item.pushStatus === 'failed' ? theme.colors.danger : theme.colors.textMuted },
                    ]}
                    numberOfLines={2}>
                    {item.pushStatus === 'accepted'
                      ? `Push accepted for ${item.pushRecipientCount ?? 0} device${item.pushRecipientCount === 1 ? '' : 's'}`
                      : item.pushStatus === 'failed'
                        ? `Push failed: ${item.pushError ?? 'Unknown delivery error'}`
                        : 'Sending push...'}
                  </Text>
                ) : null}
                <Text style={[styles.notifTime, { color: theme.colors.textMuted }]}>{timeAgo(item.createdAt)}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ color: theme.colors.textSecondary }}>Loading notifications...</Text>
            </View>
          ) : loadError ? (
            <ErrorState title="Notifications unavailable" message={loadError} />
          ) : (
            <EmptyState
              icon="notifications-off-outline"
              title="No notifications"
              message="New reporter, article, and payment alerts will appear here."
            />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 10,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 64,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  notifMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  notifTime: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  deliveryStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
  },
});
