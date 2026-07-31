import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/StateViews';
import { mockArticles } from '@/mocks/data';
import { useAppTheme } from '@/theme';

export default function ArticleDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = mockArticles.find((a) => a.id === id);

  if (!article) {
    return (
      <ScreenContainer>
        <ErrorState title="Article not found" message="This article may have been removed." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <StatusBadge status={article.status} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Image source={{ uri: article.banner }} style={[styles.banner, { borderRadius: theme.radius.lg }]} contentFit="cover" />
        <View style={[styles.categoryPill, { backgroundColor: theme.colors.primaryMuted }]}>
          <Text style={{ color: theme.colors.primary, fontSize: 11.5, fontWeight: '700' }}>{article.category}</Text>
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>{article.title}</Text>

        <View style={styles.metaRow}>
          <Icon name="time-outline" size={14} color={theme.colors.textMuted} />
          <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
            {article.readTimeMinutes} min read
          </Text>
          {article.status === 'approved' ? (
            <>
              <Icon name="eye-outline" size={14} color={theme.colors.textMuted} />
              <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>{article.views} views</Text>
            </>
          ) : null}
        </View>

        {article.status === 'rejected' && article.rejectionReason ? (
          <Card style={[styles.rejectionCard, { backgroundColor: theme.colors.dangerMuted, borderColor: theme.colors.danger }]}>
            <View style={styles.rejectionHeader}>
              <Icon name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={[styles.rejectionTitle, { color: theme.colors.danger }]}>Editorial Feedback</Text>
            </View>
            <Text style={[styles.rejectionText, { color: theme.colors.text }]}>{article.rejectionReason}</Text>
          </Card>
        ) : null}

        <Text style={[styles.body, { color: theme.colors.text }]}>{article.content}</Text>

        {article.images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18 }}>
            {article.images.map((uri, i) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={styles.galleryImage} contentFit="cover" />
            ))}
          </ScrollView>
        ) : null}
      </ScrollView>
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  banner: {
    width: '100%',
    height: 200,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 16,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '500',
    marginRight: 10,
  },
  rejectionCard: {
    marginTop: 16,
    gap: 6,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rejectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  rejectionText: {
    fontSize: 13,
    lineHeight: 19,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 18,
  },
  galleryImage: {
    width: 140,
    height: 100,
    borderRadius: 12,
    marginRight: 10,
  },
});
