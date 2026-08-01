import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ElementRef } from 'react';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { ArticleNewspaperLayout } from '@/components/ui/ArticleNewspaperLayout';
import { StatusBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ErrorState } from '@/components/ui/StateViews';
import { useArticles } from '@/context/ArticlesContext';
import { mockReporters } from '@/mocks/data';
import { useAppTheme } from '@/theme';

export default function ArticleDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getArticle } = useArticles();
  const article = getArticle(id);
  const reporterPhone = mockReporters.find((r) => r.id === article?.reporterId)?.phone;
  const viewShotRef = useRef<ElementRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);

  if (!article) {
    return (
      <ScreenContainer>
        <ErrorState title="Article not found" message="This article may have been removed." />
      </ScreenContainer>
    );
  }

  const handleShare = async () => {
    if (!viewShotRef.current?.capture) return;
    setSharing(true);
    try {
      const uri = await viewShotRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: article.title });
    } catch {
      Alert.alert('Share failed', 'Could not generate the article image. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <View style={styles.headerActions}>
          {article.status === 'approved' ? (
            <IconButton icon="share-social-outline" onPress={handleShare} disabled={sharing} />
          ) : null}
          <StatusBadge status={article.status} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {article.status === 'rejected' && article.rejectionReason ? (
          <Card style={[styles.rejectionCard, { backgroundColor: theme.colors.dangerMuted, borderColor: theme.colors.danger }]}>
            <View style={styles.rejectionHeader}>
              <Icon name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={[styles.rejectionTitle, { color: theme.colors.danger }]}>Editorial Feedback</Text>
            </View>
            <Text style={[styles.rejectionText, { color: theme.colors.text }]}>{article.rejectionReason}</Text>
          </Card>
        ) : null}

        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
          <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} />
        </ViewShot>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
