import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ElementRef } from 'react';
import { useRef, useState } from 'react';
import { Alert, LayoutChangeEvent, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 1800;
const SHARE_ASPECT = SHARE_HEIGHT / SHARE_WIDTH;

export default function ArticleDetailScreen() {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getArticle } = useArticles();
  const article = getArticle(id);
  const reporterPhone = mockReporters.find((r) => r.id === article?.reporterId)?.phone;
  const viewShotRef = useRef<ElementRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);
  const [articleHeight, setArticleHeight] = useState(0);

  const captureHeight = windowWidth * SHARE_ASPECT;
  const captureScaleY = articleHeight > 0 ? Math.min(1, captureHeight / articleHeight) : 1;

  const handleArticleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight > 0 && Math.abs(nextHeight - articleHeight) > 0.5) {
      setArticleHeight(nextHeight);
    }
  };

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
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <View style={styles.headerActions}>
          {article.status === 'approved' ? (
            <IconButton icon="share-social-outline" onPress={handleShare} disabled={sharing} />
          ) : null}
          <StatusBadge status={article.status} />
        </View>
      </View>

      <ScrollView
        style={[styles.articleScroll, { width: windowWidth }]}
        contentContainerStyle={[styles.scroll, { width: windowWidth }]}>
        {article.status === 'rejected' && article.rejectionReason ? (
          <Card style={[styles.rejectionCard, { backgroundColor: theme.colors.dangerMuted, borderColor: theme.colors.danger }]}>
            <View style={styles.rejectionHeader}>
              <Icon name="alert-circle" size={18} color={theme.colors.danger} />
              <Text style={[styles.rejectionTitle, { color: theme.colors.danger }]}>Editorial Feedback</Text>
            </View>
            <Text style={[styles.rejectionText, { color: theme.colors.text }]}>{article.rejectionReason}</Text>
          </Card>
        ) : null}

        <View onLayout={handleArticleLayout}>
          <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} />
        </View>
      </ScrollView>

      <View pointerEvents="none" style={styles.captureHost}>
        <ViewShot
          ref={viewShotRef}
          style={[styles.articleCapture, { width: windowWidth, height: captureHeight }]}
          options={{ format: 'png', quality: 1, width: SHARE_WIDTH, height: SHARE_HEIGHT }}>
          <View
            style={[
              styles.captureContent,
              {
                width: windowWidth,
                transform: [{ scaleY: captureScaleY }],
              },
            ]}>
            <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} shareMode />
          </View>
        </ViewShot>
      </View>
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
    paddingTop: 8,
    paddingBottom: 48,
  },
  articleScroll: {
    alignSelf: 'stretch',
  },
  articleCapture: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  captureHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  captureContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
    backgroundColor: '#FFFFFF',
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
    marginHorizontal: 20,
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
