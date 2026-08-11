import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ElementRef } from 'react';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { ArticleNewspaperLayout, TwoArticleNewspaperLayout } from '@/components/ui/ArticleNewspaperLayout';
import { StatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ErrorState } from '@/components/ui/StateViews';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';
import type { Article } from '@/types/models';

const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 1800;
const CAPTURE_LAYOUT_WIDTH = 768;
const CAPTURE_LAYOUT_HEIGHT = 1152;

export default function ArticleDetailScreen() {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { articles, getArticle } = useArticles();
  const article = getArticle(id);
  const { getReporter, getReporterByEmail } = useReporters();
  const currentReporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const ownsArticle = article
    ? [currentReporter?.id, user?.id].some((reporterId) => reporterId === article.reporterId)
    : false;
  const canViewArticle = article?.status === 'approved' || ownsArticle;
  const reporterPhone = article?.reporterPhone ?? (article ? getReporter(article.reporterId)?.phone : undefined);
  const viewShotRef = useRef<ElementRef<typeof ViewShot>>(null);
  const pairViewShotRef = useRef<ElementRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pairArticle, setPairArticle] = useState<Article | null>(null);
  const [pairSharing, setPairSharing] = useState(false);

  const pairCandidates = articles.filter((a) => a.status === 'approved' && a.id !== article?.id);

  if (!article || !canViewArticle) {
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

  const handleSharePair = async () => {
    if (!pairViewShotRef.current?.capture) return;
    setPairSharing(true);
    try {
      const uri = await pairViewShotRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: article.title });
    } catch {
      Alert.alert('Share failed', 'Could not generate the combined image. Please try again.');
    } finally {
      setPairSharing(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <View style={styles.headerActions}>
          {article.status === 'approved' ? (
            <IconButton icon="layers-outline" onPress={() => setPickerVisible(true)} />
          ) : null}
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
            <Button
              label="Edit and Resubmit"
              icon="create-outline"
              onPress={() => router.push({ pathname: '/(reporter)/create-article', params: { id: article.id } })}
              fullWidth
            />
          </Card>
        ) : null}

        <View>
          <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} />
        </View>

        {pairArticle ? (
          <View style={styles.pairSection}>
            <View style={styles.pairHeader}>
              <Text style={[styles.pairHeading, { color: theme.colors.text }]}>Combined page preview</Text>
              <Button label="Remove" variant="ghost" size="sm" onPress={() => setPairArticle(null)} />
            </View>
            <TwoArticleNewspaperLayout articles={[article, pairArticle]} />
            <Button
              label={pairSharing ? 'Preparing…' : 'Share Combined Page'}
              icon="share-social-outline"
              onPress={handleSharePair}
              disabled={pairSharing}
              fullWidth
            />
          </View>
        ) : null}
      </ScrollView>

      <View pointerEvents="none" style={styles.captureHost}>
        <ViewShot
          ref={viewShotRef}
          style={[styles.articleCapture, { width: CAPTURE_LAYOUT_WIDTH, height: CAPTURE_LAYOUT_HEIGHT }]}
          options={{ format: 'png', quality: 1, width: SHARE_WIDTH, height: SHARE_HEIGHT }}>
          <View style={[styles.captureContent, { width: CAPTURE_LAYOUT_WIDTH }]}>
            <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} shareMode />
          </View>
        </ViewShot>
      </View>

      {pairArticle ? (
        <View pointerEvents="none" style={styles.captureHost}>
          <ViewShot ref={pairViewShotRef} options={{ format: 'png', quality: 1 }}>
            <TwoArticleNewspaperLayout articles={[article, pairArticle]} />
          </ViewShot>
        </View>
      ) : null}

      <Dialog
        visible={pickerVisible}
        title="Combine with another article"
        message={pairCandidates.length === 0 ? 'No other approved articles are available.' : undefined}
        onRequestClose={() => setPickerVisible(false)}
        actions={[{ label: 'Cancel', onPress: () => setPickerVisible(false) }]}>
        {pairCandidates.length > 0 ? (
          <ScrollView style={styles.pickerList}>
            {pairCandidates.map((candidate) => (
              <Pressable
                key={candidate.id}
                style={[styles.pickerItem, { borderColor: theme.colors.border }]}
                onPress={() => {
                  setPairArticle(candidate);
                  setPickerVisible(false);
                }}>
                <Text style={[styles.pickerItemText, { color: theme.colors.text }]} numberOfLines={2}>
                  {candidate.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </Dialog>
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
    backgroundColor: '#FFFFFF',
  },
  pairSection: {
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  pairHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pairHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerList: {
    maxHeight: 260,
    width: '100%',
  },
  pickerItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '600',
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
