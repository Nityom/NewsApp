import { router } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { EmptyState } from '@/components/ui/StateViews';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useReporters } from '@/context/ReportersContext';
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

export default function ReporterNotificationsScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { getReporterByEmail } = useReporters();
  const { getForReporter, markAllRead } = useNotifications();
  const reporterId = user?.email ? getReporterByEmail(user.email)?.id : undefined;
  const notifications = getForReporter([reporterId, user?.id].filter((id): id is string => !!id));
  const unreadIds = notifications.filter((notification) => !notification.isRead).map((notification) => notification.id);

  useEffect(() => {
    if (unreadIds.length > 0) markAllRead(unreadIds).catch(() => {});
  }, [markAllRead, unreadIds.join(',')]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Notifications</Text>
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
                if (item.articleId) router.push(`/(reporter)/article/${item.articleId}`);
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
                <Text style={[styles.notifTime, { color: theme.colors.textMuted }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="notifications-off-outline" title="No notifications" message="You're all caught up!" />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
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
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 4,
  },
});
