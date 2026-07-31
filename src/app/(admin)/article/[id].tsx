import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/Badge';
import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ArticleNewspaperLayout } from '@/components/ui/ArticleNewspaperLayout';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ErrorState } from '@/components/ui/StateViews';
import { mockArticles, mockReporters } from '@/mocks/data';
import { useAppTheme } from '@/theme';

export default function AdminArticleDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = mockArticles.find((a) => a.id === id);
  const reporterPhone = mockReporters.find((r) => r.id === article?.reporterId)?.phone;
  const [rejectVisible, setRejectVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [advertisements, setAdvertisements] = useState<string[]>(article?.advertisements ?? []);

  if (!article) {
    return (
      <ScreenContainer>
        <ErrorState title="Article not found" />
      </ScreenContainer>
    );
  }

  const pickAd = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload ad photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;
    setAdvertisements((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
  };

  const saveAdvertisements = () => {
    article.advertisements = advertisements;
    Alert.alert('Advertisements Saved', 'The ad photos for this article have been updated.');
  };

  const approve = () => {
    Alert.alert('Article Approved', 'The article has been published successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const reject = () => {
    if (!reason.trim()) return;
    setRejectVisible(false);
    Alert.alert('Article Rejected', 'Feedback has been sent to the reporter.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <StatusBadge status={article.status} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.authorRow}>
          <Image source={{ uri: article.reporterAvatar }} style={styles.authorAvatar} />
          <View>
            <Text style={[styles.authorName, { color: theme.colors.text }]}>{article.reporterName}</Text>
            <Text style={[styles.authorMeta, { color: theme.colors.textMuted }]}>{article.category}</Text>
          </View>
        </View>

        <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} />

        <View style={{ marginTop: 24 }}>
          <Text style={[styles.summary, { color: theme.colors.textSecondary, marginTop: 0, fontWeight: '700' }]}>
            Advertisements ({advertisements.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View
              style={[
                styles.adAddTile,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSubtle },
              ]}
              onTouchEnd={pickAd}>
              <Icon name="add" size={24} color={theme.colors.textMuted} />
            </View>
            {advertisements.map((uri, i) => (
              <View key={`${uri}-${i}`} style={styles.adTile}>
                <Image source={{ uri }} style={styles.adThumb} contentFit="cover" />
                <View
                  style={styles.removeBadge}
                  onTouchEnd={() => setAdvertisements((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Icon name="close" size={12} color="#fff" />
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 12 }}>
            <Button label="Save Advertisements" variant="outline" onPress={saveAdvertisements} />
          </View>
        </View>

        {article.status === 'pending' ? (
          <>
            <View style={{ height: 24 }} />
            <ButtonRow>
              <View style={{ flex: 1 }}>
                <Button label="Reject" variant="danger" icon="close" onPress={() => setRejectVisible(true)} fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Approve" icon="checkmark" onPress={approve} fullWidth />
              </View>
            </ButtonRow>
          </>
        ) : null}
      </ScrollView>

      <Dialog
        visible={rejectVisible}
        title="Reject Article"
        message="Provide a reason so the reporter can improve and resubmit."
        onRequestClose={() => setRejectVisible(false)}
        actions={[
          { label: 'Cancel', variant: 'outline', onPress: () => setRejectVisible(false) },
          { label: 'Send Feedback', variant: 'danger', onPress: reject },
        ]}>
        <View style={{ marginBottom: 6 }}>
          <Input
            placeholder="Reason for rejection..."
            multiline
            value={reason}
            onChangeText={setReason}
            style={{ minHeight: 80 }}
          />
        </View>
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  banner: {
    width: '100%',
    height: 190,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  authorMeta: {
    fontSize: 11.5,
    marginTop: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 27,
    marginTop: 14,
  },
  summary: {
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 8,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 23,
    marginTop: 16,
  },
  galleryImage: {
    width: 140,
    height: 100,
    borderRadius: 12,
    marginRight: 10,
  },
  adAddTile: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  adTile: {
    width: 76,
    height: 76,
    marginRight: 10,
  },
  adThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
