import DateTimePicker from '@expo/ui/community/datetime-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ElementRef } from 'react';
import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { ArticleNewspaperLayout } from '@/components/ui/ArticleNewspaperLayout';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ErrorState } from '@/components/ui/StateViews';
import { useArticles } from '@/context/ArticlesContext';
import { formatRegistrationDate } from '@/context/PublicationInfoContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

const SHARE_WIDTH = 1200;
const SHARE_HEIGHT = 1800;
const CAPTURE_LAYOUT_WIDTH = 768;
const CAPTURE_LAYOUT_HEIGHT = 1152;

function parseRegistrationDate(label?: string, fallbackIso?: string) {
  const match = label?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }
  return fallbackIso ? new Date(fallbackIso) : new Date();
}

export default function AdminArticleDetailScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getArticle, updateArticle, deleteArticle } = useArticles();
  const article = getArticle(id);
  const { getReporter } = useReporters();
  const reporter = article ? getReporter(article.reporterId) : undefined;
  const reporterPhone = article?.reporterPhone ?? reporter?.phone;
  const reporterPhoto = reporter?.photo || reporter?.avatar || article?.reporterAvatar;
  const [rejectVisible, setRejectVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [advertisements, setAdvertisements] = useState<string[]>(article?.advertisements ?? []);
  const [registrationDate, setRegistrationDate] = useState(
    article?.registrationDate ?? (article?.reviewedAt ? formatRegistrationDate(article.reviewedAt) : ''),
  );
  const [selectedRegistrationDate, setSelectedRegistrationDate] = useState(() =>
    parseRegistrationDate(article?.registrationDate, article?.reviewedAt),
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const viewShotRef = useRef<ElementRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);

  if (!article) {
    return (
      <ScreenContainer>
        <ErrorState title="Article not found" />
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

  const pickAd = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload ad photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    setAdvertisements((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
  };

  const saveAdvertisements = async () => {
    await updateArticle(article.id, { advertisements });
    Alert.alert('Advertisements Saved', 'The ad photos for this article have been updated.');
  };

  const saveRegistrationDate = async () => {
    await updateArticle(article.id, { registrationDate });
    Alert.alert('Saved', 'The दिनांक for this article has been updated.');
  };

  const selectRegistrationDate = (date: Date) => {
    setDatePickerVisible(false);
    setSelectedRegistrationDate(date);
    setRegistrationDate(formatRegistrationDate(date.toISOString()));
  };

  const approve = async () => {
    const now = new Date().toISOString();
    const registrationLabel = registrationDate || formatRegistrationDate(now);
    await updateArticle(article.id, { status: 'approved', reviewedAt: now, registrationDate: registrationLabel });
    setRegistrationDate(registrationLabel);
    Alert.alert('Article Approved', 'The article has been published successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const reject = async () => {
    if (!reason.trim()) return;
    setRejectVisible(false);
    await updateArticle(article.id, {
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedAt: new Date().toISOString(),
    });
    Alert.alert('Article Rejected', 'Feedback has been sent to the reporter.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const moveToTrash = async () => {
    setDeleteVisible(false);
    await updateArticle(article.id, { status: 'trashed' });
    Alert.alert('Article Deleted', 'The article has been moved to Trash.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const restoreFromTrash = async () => {
    await updateArticle(article.id, { status: 'pending' });
    Alert.alert('Article Restored', 'The article has been moved back to Pending.');
  };

  const deleteForever = async () => {
    setDeleteVisible(false);
    await deleteArticle(article.id);
    Alert.alert('Article Removed', 'The article has been permanently deleted.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <View style={styles.headerActions}>
          <StatusBadge status={article.status} />
          {article.status === 'approved' ? (
            <IconButton icon="share-social-outline" onPress={handleShare} disabled={sharing} />
          ) : null}
          <IconButton
            icon="create-outline"
            onPress={() => router.push({ pathname: '/(reporter)/create-article', params: { id: article.id } })}
          />
          <IconButton icon="trash-outline" color={theme.colors.danger} onPress={() => setDeleteVisible(true)} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.authorRow}>
          <Avatar uri={reporterPhoto} name={reporter?.name ?? article.reporterName} size={34} />
          <Text style={[styles.authorName, { color: theme.colors.text }]}>{article.reporterName}</Text>
        </View>

        <View>
          <ArticleNewspaperLayout article={article} reporterPhone={reporterPhone} />
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={[styles.summary, { color: theme.colors.textSecondary, marginTop: 0, fontWeight: '700' }]}>
            दिनांक (Registration Date)
          </Text>
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setDatePickerVisible(true)}
              style={[
                styles.dateButton,
                { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border },
              ]}>
              <Icon name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.dateValue, { color: theme.colors.text }]}>
                {registrationDate || 'Select date'}
              </Text>
              <Icon name="chevron-down" size={18} color={theme.colors.textMuted} />
            </Pressable>
            <Button label="Save" variant="outline" onPress={saveRegistrationDate} />
          </View>
          {datePickerVisible ? (
            <DateTimePicker
              value={selectedRegistrationDate}
              mode="date"
              display="calendar"
              presentation="dialog"
              accentColor={theme.colors.primary}
              onValueChange={(_, date) => selectRegistrationDate(date)}
              onDismiss={() => setDatePickerVisible(false)}
            />
          ) : null}
        </View>

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

        {article.status === 'trashed' ? (
          <>
            <View style={{ height: 24 }} />
            <ButtonRow>
              <View style={{ flex: 1 }}>
                <Button label="Restore" variant="outline" icon="refresh" onPress={restoreFromTrash} fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Delete Forever" variant="danger" icon="trash" onPress={deleteForever} fullWidth />
              </View>
            </ButtonRow>
          </>
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

      <Dialog
        visible={deleteVisible}
        title={article.status === 'trashed' ? 'Delete Permanently?' : 'Delete Article?'}
        message={
          article.status === 'trashed'
            ? 'This will permanently remove the article. This action cannot be undone.'
            : 'This will move the article to Trash. The reporter will no longer see it as active.'
        }
        onRequestClose={() => setDeleteVisible(false)}
        actions={[
          { label: 'Cancel', variant: 'outline', onPress: () => setDeleteVisible(false) },
          {
            label: article.status === 'trashed' ? 'Delete Forever' : 'Delete',
            variant: 'danger',
            onPress: article.status === 'trashed' ? deleteForever : moveToTrash,
          },
        ]}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  dateButton: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  captureHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  articleCapture: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  captureContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: '#FFFFFF',
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
  authorName: {
    fontSize: 13.5,
    fontWeight: '700',
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
