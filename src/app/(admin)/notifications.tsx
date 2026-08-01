import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { EmptyState } from '@/components/ui/StateViews';
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
  const { getForAudience, markRead } = useNotifications();
  const notifications = getForAudience('admin');

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
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
                if (!item.isRead) markRead(item.id);
                if (item.articleId) router.push(`/(admin)/article/${item.articleId}`);
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
            </Pressable>
          );
        }}
        ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="No notifications" />}
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
});
