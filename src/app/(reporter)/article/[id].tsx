import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ElementRef } from 'react';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { ArticleNewspaperLayout, plainArticleText } from '@/components/ui/ArticleNewspaperLayout';
import { StatusBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ErrorState } from '@/components/ui/StateViews';
import { useArticles } from '@/context/ArticlesContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 1800;
const SHARE_ASPECT = SHARE_HEIGHT / SHARE_WIDTH;

export default function ArticleDetailScreen() {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getArticle } = useArticles();
  const { getReporter } = useReporters();
  const article = getArticle(id);
  const reporterPhone = article ? getReporter(article.reporterId)?.phone : undefined;
  const viewShotRef1 = useRef<ElementRef<typeof ViewShot>>(null);
  const viewShotRef2 = useRef<ElementRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);
  const [page1Height, setPage1Height] = useState(windowWidth * SHARE_ASPECT);
  const [page2Height, setPage2Height] = useState(windowWidth * SHARE_ASPECT);
  const hasPage2 = !!(article?.page2 && article.page2.title.trim());

  if (!article) {
    return (
      <ScreenContainer>
        <ErrorState title="Article not found" message="This article may have been removed." />
      </ScreenContainer>
    );
  }

  const capturePage = async (page: 1 | 2) => {
    const ref = page === 1 ? viewShotRef1 : viewShotRef2;
    if (!ref.current?.capture) return null;
    return await ref.current.capture();
  };

  const shareSinglePage = async (page: 1 | 2) => {
    setSharing(true);
    try {
      const uri = await capturePage(page);
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
        return;
      }
      const pageTitle = page === 2 && article.page2?.title
        ? `${plainArticleText(article.page2.title)} (Page 2)`
        : `${plainArticleText(article.title)} (Page ${page})`;
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: pageTitle });
    } catch {
      Alert.alert('Share failed', `Could not generate Page ${page} image. Please try again.`);
    } finally {
      setSharing(false);
    }
  };

  const handleShare = async () => {
    if (!hasPage2) {
      await shareSinglePage(1);
      return;
    }

    Alert.alert(
      'Share Newspaper Page',
      'This article has 2 separate pages. Which page would you like to share?',
      [
        {
          text: 'Share Page 1 (पृष्ठ १)',
          onPress: () => shareSinglePage(1),
        },
        {
          text: 'Share Page 2 (पृष्ठ २)',
          onPress: () => shareSinglePage(2),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
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

        <View>
          <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} shareMode />
        </View>
      </ScrollView>

      <View pointerEvents="none" style={styles.captureHost}>
        <ViewShot
          ref={viewShotRef1}
          style={[styles.articleCapture, { width: windowWidth, height: page1Height }]}
          options={{
            format: 'png',
            quality: 1,
            width: SHARE_WIDTH,
            height: Math.round(SHARE_WIDTH * (page1Height / windowWidth)),
          }}>
          <View
            style={[styles.captureContent, { width: windowWidth }]}
            onLayout={({ nativeEvent }) => {
              const measured = Math.ceil(nativeEvent.layout.height);
              if (measured > 0 && Math.abs(measured - page1Height) > 1) {
                setPage1Height(measured);
              }
            }}>
            <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} shareMode pageOnly={1} />
          </View>
        </ViewShot>

        {hasPage2 ? (
          <ViewShot
            ref={viewShotRef2}
            style={[styles.articleCapture, { width: windowWidth, height: page2Height, marginTop: 40 }]}
            options={{
              format: 'png',
              quality: 1,
              width: SHARE_WIDTH,
              height: Math.round(SHARE_WIDTH * (page2Height / windowWidth)),
            }}>
            <View
              style={[styles.captureContent, { width: windowWidth }]}
              onLayout={({ nativeEvent }) => {
                const measured = Math.ceil(nativeEvent.layout.height);
                if (measured > 0 && Math.abs(measured - page2Height) > 1) {
                  setPage2Height(measured);
                }
              }}>
              <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} shareMode pageOnly={2} />
            </View>
          </ViewShot>
        ) : null}
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
