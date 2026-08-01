import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';
import type { Article } from '@/types/models';
import { StatusBadge } from './Badge';
import { Icon } from './Icon';

interface ArticleCardProps {
  article: Article;
  onPress?: () => void;
  showStatus?: boolean;
  showAuthor?: boolean;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ArticleCard({ article, onPress, showStatus = true, showAuthor = false }: ArticleCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.92 : 1,
          ...theme.shadow('sm'),
        },
      ]}>
      <Image source={{ uri: article.banner }} style={styles.banner} contentFit="cover" transition={200} />
      <View style={styles.body}>
        {showStatus ? (
          <View style={styles.topRow}>
            <StatusBadge status={article.status} size="sm" />
          </View>
        ) : null}
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={[styles.summary, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {article.summary}
        </Text>
        <View style={styles.metaRow}>
          {showAuthor ? (
            <View style={styles.metaItem}>
              <Image source={{ uri: article.reporterAvatar }} style={styles.avatar} />
              <Text style={[styles.metaText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {article.reporterName}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Icon name="time-outline" size={13} color={theme.colors.textMuted} />
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {timeAgo(article.updatedAt)}
            </Text>
          </View>
          {article.status === 'approved' ? (
            <View style={styles.metaItem}>
              <Icon name="eye-outline" size={13} color={theme.colors.textMuted} />
              <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>{article.views}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  banner: {
    width: '100%',
    height: 150,
  },
  body: {
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 2,
  },
  summary: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
