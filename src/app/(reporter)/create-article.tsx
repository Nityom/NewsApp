import DateTimePicker from '@expo/ui/community/datetime-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, Image as RNImage, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ArticleNewspaperLayout } from '@/components/ui/ArticleNewspaperLayout';
import { BlogTextEditor, countArticleWords, limitArticleWords } from '@/components/ui/BlogTextEditor';
import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { formatRegistrationDate } from '@/context/PublicationInfoContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';
import type { Article, ArticleSection } from '@/types/models';

const MAX_ARTICLE_WORDS = 500;

type CropTarget = {
  uri: string;
  width: number;
  height: number;
  kind: 'banner' | 'gallery' | 'ad' | 'section';
  index?: number;
  sectionId?: string;
};

const articleSummary = (value: string) =>
  value
    .replace(/^(?:# |\- |> )/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

function parseRegistrationDate(label?: string) {
  const match = label?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match
    ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
    : new Date();
}

export default function CreateArticleScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { articles, addArticle, updateArticle } = useArticles();
  const { getReporterByEmail } = useReporters();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const params = useLocalSearchParams<{ id?: string }>();
  const reporterIds = useMemo(
    () => new Set([reporter?.id, user?.id].filter((id): id is string => !!id)),
    [reporter?.id, user?.id],
  );
  const editingDraft = useMemo(
    () => (params.id ? articles.find((article) =>
      article.id === params.id && (user?.role === 'admin' || reporterIds.has(article.reporterId))) : undefined),
    [articles, params.id, reporterIds, user?.role],
  );

  const isAdminEditing = isAdmin && !!editingDraft;

  const [banner, setBanner] = useState<string | undefined>(editingDraft?.banner);
  const [title, setTitle] = useState(editingDraft?.title ?? '');
  const [content, setContent] = useState(editingDraft?.content ?? '');
  const pageScrollRef = useRef<ScrollView>(null);
  const editorTopRef = useRef(0);
  const [images, setImages] = useState<string[]>(editingDraft?.images ?? []);
  const [advertisements, setAdvertisements] = useState<string[]>(editingDraft?.advertisements ?? []);
  const [sections, setSections] = useState<ArticleSection[]>(editingDraft?.sections ?? []);
  const [submitting, setSubmitting] = useState<'draft' | 'submit' | 'save' | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [registrationDate, setRegistrationDate] = useState(
    editingDraft?.registrationDate ?? formatRegistrationDate(new Date().toISOString()),
  );
  const [selectedRegistrationDate, setSelectedRegistrationDate] = useState(() =>
    parseRegistrationDate(editingDraft?.registrationDate),
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [pendingCropTargets, setPendingCropTargets] = useState<CropTarget[]>([]);

  const pickImage = async (mode: 'banner' | 'gallery' | 'ad') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: mode === 'gallery',
      selectionLimit: mode === 'gallery' ? 2 : 1,
      orderedSelection: mode === 'gallery',
    });
    if (result.canceled) return;
    if (mode === 'ad') {
      setAdvertisements((current) => [...current, ...result.assets.map((asset) => asset.uri)]);
      return;
    }
    const selectedTargets = result.assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      kind: mode,
    } satisfies CropTarget));
    const [firstTarget, ...remainingTargets] = selectedTargets;
    if (!firstTarget) return;

    setPendingCropTargets(remainingTargets);
    setCropTarget(firstTarget);
  };

  const addSection = () => {
    if (countArticleWords(content) > MAX_ARTICLE_WORDS) {
      Alert.alert(
        'Shorten the main article',
        `Two-in-one articles are limited to ${MAX_ARTICLE_WORDS} words per story. Shorten the main article before adding another one.`,
      );
      return;
    }
    setSections((prev) => [...prev, { id: `sec-${Date.now()}`, title: '', content: '' }]);
  };

  const updateSection = (id: string, patch: Partial<ArticleSection>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const pickSectionImage = async (id: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset) {
      setCropTarget({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        kind: 'section',
        sectionId: id,
      });
    }
  };

  const handleCropComplete = (uri: string) => {
    if (!cropTarget) return;
    if (cropTarget.kind === 'banner') {
      setBanner(uri);
    } else if (cropTarget.kind === 'gallery') {
      setImages((prev) => cropTarget.index === undefined
        ? [...prev, uri]
        : prev.map((image, index) => index === cropTarget.index ? uri : image));
    } else if (cropTarget.kind === 'ad') {
      setAdvertisements((prev) => cropTarget.index === undefined
        ? [...prev, uri]
        : prev.map((image, index) => index === cropTarget.index ? uri : image));
    } else if (cropTarget.sectionId) {
      updateSection(cropTarget.sectionId, { image: uri });
    }
    const [nextTarget, ...remainingTargets] = pendingCropTargets;
    setPendingCropTargets(remainingTargets);
    setCropTarget(nextTarget ?? null);
  };

  const handleCropCancel = () => {
    const [nextTarget, ...remainingTargets] = pendingCropTargets;
    setPendingCropTargets(remainingTargets);
    setCropTarget(nextTarget ?? null);
  };

  const adjustPreviewImage = async (target: {
    kind: 'banner' | 'gallery' | 'ad' | 'section';
    index?: number;
    sectionId?: string;
    uri: string;
  }) => {
    try {
      const uri = target.uri.startsWith('file://')
        ? target.uri
        : (await FileSystem.downloadAsync(
            target.uri,
            `${FileSystem.cacheDirectory}article-adjust-${Date.now()}.jpg`,
          )).uri;
      RNImage.getSize(
        uri,
        (width, height) => setCropTarget({ ...target, uri, width, height }),
        () => Alert.alert('Could not edit photo', 'The selected image could not be loaded. Please choose it again.'),
      );
    } catch {
      Alert.alert('Could not edit photo', 'The selected image could not be downloaded. Check your connection and try again.');
    }
  };

  const handleSave = async (kind: 'draft' | 'submit' | 'save') => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter an article title before continuing.');
      return;
    }
    if (!banner) {
      Alert.alert('Banner required', 'Please upload a news photo before continuing.');
      return;
    }
    if (sections.length > 0 && countArticleWords(content) > MAX_ARTICLE_WORDS) {
      Alert.alert(
        'Main article is too long',
        `Two-in-one articles are limited to ${MAX_ARTICLE_WORDS} words per story. Shorten the main article before continuing.`,
      );
      return;
    }
    const oversizedSectionIndex = sections.findIndex(
      (section) => countArticleWords(section.content) > MAX_ARTICLE_WORDS,
    );
    if (oversizedSectionIndex >= 0) {
      Alert.alert(
        `Article ${oversizedSectionIndex + 2} is too long`,
        `Each story in a combined article is limited to ${MAX_ARTICLE_WORDS} words.`,
      );
      return;
    }
    setSubmitting(kind);
    const now = new Date().toISOString();
    const status = kind === 'draft' ? 'draft' : kind === 'submit' ? (isAdmin ? 'approved' : 'pending') : editingDraft?.status ?? 'pending';
    const cleanSections = sections.filter((s) => s.title.trim() || s.content.trim() || s.image);
    const adminPublicationFields = isAdmin
      ? { registrationDate }
      : {};

    try {
      if (editingDraft) {
        await updateArticle(editingDraft.id, {
          title,
          summary: articleSummary(content),
          content,
          banner,
          images,
          advertisements,
          sections: cleanSections,
          status,
          updatedAt: now,
          submittedAt: kind === 'submit' ? now : editingDraft.submittedAt,
          reviewedAt: kind === 'submit' && isAdmin ? now : editingDraft.reviewedAt,
          ...adminPublicationFields,
        });
      } else {
        const newArticle: Article = {
          id: `art-${Date.now()}`,
          title,
          summary: articleSummary(content),
          content,
          banner,
          images,
          advertisements,
          sections: cleanSections,
          status,
          reporterId: reporter?.id ?? user?.id ?? 'unknown',
          reporterName: user?.name ?? 'Unknown Reporter',
          reporterAvatar: user?.avatar ?? '',
          reporterPhone: user?.phone,
          createdAt: now,
          updatedAt: now,
          submittedAt: kind === 'submit' ? now : undefined,
          reviewedAt: kind === 'submit' && isAdmin ? now : undefined,
          ...adminPublicationFields,
          views: 0,
          likes: 0,
          readTimeMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 200)),
        };
        await addArticle(newArticle);
      }

      setSubmitting(null);
      const messages: Record<typeof kind, [string, string]> = {
        draft: ['Saved to Drafts', 'Your article has been saved as a draft.'],
        submit: isAdmin
          ? ['Article Published', 'The article has been published successfully.']
          : ['Submitted for Review', 'Your article has been submitted to the editorial team for review.'],
        save: ['Changes Saved', 'The article has been updated.'],
      };
      const [title_, message] = messages[kind];
      setPreviewVisible(false);
      Alert.alert(title_, message, [{
        text: 'OK',
        onPress: () => {
          if (isAdmin) {
            router.replace({
              pathname: '/(admin)/(tabs)/articles',
              params: { status },
            });
          } else {
            router.back();
          }
        },
      }]);
    } catch (error) {
      setSubmitting(null);
      console.error('Failed to save article:', error);
      Alert.alert(
        'Something went wrong',
        `Could not save the article. ${error instanceof Error ? error.message : 'Please try again.'}`,
      );
    }
  };

  const requestSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter an article title before continuing.');
      return;
    }
    if (!banner) {
      Alert.alert('Banner required', 'Please upload a news photo before continuing.');
      return;
    }
    setPreviewVisible(true);
  };

  const previewArticle: Article = useMemo(
    () => ({
      id: editingDraft?.id ?? 'preview',
      title,
      summary: articleSummary(content),
      content,
      banner: banner ?? '',
      images,
      advertisements,
      sections: sections.filter((s) => s.title.trim() || s.content.trim() || s.image),
      status: editingDraft?.status ?? 'pending',
      reporterId: editingDraft?.reporterId ?? reporter?.id ?? user?.id ?? 'unknown',
      reporterName: editingDraft?.reporterName ?? user?.name ?? 'Unknown Reporter',
      reporterAvatar: editingDraft?.reporterAvatar ?? user?.avatar ?? '',
      reporterPhone: editingDraft?.reporterPhone ?? user?.phone,
      createdAt: editingDraft?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      registrationDate: isAdmin ? registrationDate : editingDraft?.registrationDate,
      views: editingDraft?.views ?? 0,
      likes: editingDraft?.likes ?? 0,
      readTimeMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 200)),
    }),
    [editingDraft, title, content, banner, images, advertisements, sections, isAdmin, registrationDate, reporter?.id, user],
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isAdminEditing ? 'Edit Article' : editingDraft ? 'Edit Article' : 'New Article'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView ref={pageScrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>News Photo</Text>
        <View
          style={[
            styles.bannerWrap,
            {
              backgroundColor: theme.colors.backgroundSubtle,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
          onTouchEnd={() => pickImage('banner')}>
          {banner ? (
            <Image source={{ uri: banner }} style={styles.bannerImage} contentFit="cover" />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Icon name="image-outline" size={28} color={theme.colors.textMuted} />
              <Text style={[styles.bannerText, { color: theme.colors.textMuted }]}>Tap to upload banner</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          Title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a compelling headline"
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.titleInput,
            { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: theme.radius.md },
          ]}
          multiline
        />

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          Article Body
        </Text>
        <View
          onLayout={(event) => {
            editorTopRef.current = event.nativeEvent.layout.y;
          }}>
          <BlogTextEditor
            initialValue={content}
            onChange={setContent}
            maxWords={sections.length > 0 ? MAX_ARTICLE_WORDS : undefined}
            onCursorPosition={(offsetY) => {
              pageScrollRef.current?.scrollTo({
                y: Math.max(0, editorTopRef.current + offsetY - 180),
                animated: true,
              });
            }}
          />
          <Text style={[styles.sectionCharCount, { color: theme.colors.textMuted }]}>
            {countArticleWords(content)}{sections.length > 0 ? `/${MAX_ARTICLE_WORDS}` : ''} words
          </Text>
        </View>

        <View style={styles.imagesHeader}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            Add Photo ({images.length})
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          <View
            style={[
              styles.addImageTile,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSubtle, borderRadius: theme.radius.md },
            ]}
            onTouchEnd={() => pickImage('gallery')}>
            <Icon name="add" size={24} color={theme.colors.textMuted} />
          </View>
          {images.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.imageTile}>
              <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
              <View style={styles.removeBadge} onTouchEnd={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}>
                <Icon name="close" size={12} color="#fff" />
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.imagesHeader, { marginTop: 20 }]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            Add Advertisement Photo ({advertisements.length})
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          <View
            style={[
              styles.addImageTile,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSubtle, borderRadius: theme.radius.md },
            ]}
            onTouchEnd={() => pickImage('ad')}>
            <Icon name="add" size={24} color={theme.colors.textMuted} />
          </View>
          {advertisements.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.imageTile}>
              <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
              <View
                style={styles.removeBadge}
                onTouchEnd={() => setAdvertisements((prev) => prev.filter((_, idx) => idx !== i))}>
                <Icon name="close" size={12} color="#fff" />
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.imagesHeader, { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
            Additional Articles ({sections.length})
          </Text>
          <IconButton icon="add-circle-outline" size={22} onPress={addSection} />
        </View>
        {sections.map((section, i) => (
          <View
            key={section.id}
            style={[
              styles.sectionCard,
              { backgroundColor: theme.colors.backgroundSubtle, borderRadius: theme.radius.md, borderColor: theme.colors.border },
            ]}>
            <View style={styles.sectionCardHeader}>
              <Text style={[styles.sectionCardLabel, { color: theme.colors.textMuted }]}>Article {i + 2}</Text>
              <IconButton icon="trash-outline" size={18} onPress={() => removeSection(section.id)} />
            </View>
            <View
              style={[styles.sectionImageWrap, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}
              onTouchEnd={() => pickSectionImage(section.id)}>
              {section.image ? (
                <Image source={{ uri: section.image }} style={styles.sectionImagePreview} contentFit="cover" />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Icon name="image-outline" size={22} color={theme.colors.textMuted} />
                  <Text style={[styles.bannerText, { color: theme.colors.textMuted }]}>Tap to add photo (optional)</Text>
                </View>
              )}
            </View>
            <TextInput
              value={section.title}
              onChangeText={(text) => updateSection(section.id, { title: text })}
              placeholder="Headline for this story"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.titleInput,
                { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: theme.radius.md, fontSize: 15, marginTop: 12 },
              ]}
              multiline
            />
            <TextInput
              value={section.content}
              onChangeText={(text) => updateSection(section.id, {
                content: limitArticleWords(text, MAX_ARTICLE_WORDS),
              })}
              placeholder="Write this story..."
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.bodyInput,
                { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: theme.radius.md, minHeight: 100, marginTop: 10 },
              ]}
              multiline
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.sectionCharCount,
                { color: theme.colors.textMuted },
              ]}>
              {countArticleWords(section.content)}/{MAX_ARTICLE_WORDS} words
            </Text>
          </View>
        ))}

        {isAdmin ? (
          <View style={styles.dateSection}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Publication Date</Text>
            <Pressable
              onPress={() => setDatePickerVisible(true)}
              style={[
                styles.dateButton,
                { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border },
              ]}>
              <Icon name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.dateValue, { color: theme.colors.text }]}>{registrationDate}</Text>
              <Icon name="chevron-down" size={18} color={theme.colors.textMuted} />
            </Pressable>
            {datePickerVisible ? (
              <DateTimePicker
                value={selectedRegistrationDate}
                mode="date"
                display="calendar"
                presentation="dialog"
                accentColor={theme.colors.primary}
                onValueChange={(_, date) => {
                  setDatePickerVisible(false);
                  setSelectedRegistrationDate(date);
                  setRegistrationDate(formatRegistrationDate(date.toISOString()));
                }}
                onDismiss={() => setDatePickerVisible(false)}
              />
            ) : null}
          </View>
        ) : null}

        {user ? (
          <View
            style={[
              styles.reporterFooter,
              { backgroundColor: theme.colors.backgroundSubtle, borderRadius: theme.radius.md },
            ]}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
              Published Footer
            </Text>
            <Text style={[styles.reporterFooterText, { color: theme.colors.text }]}>
              {user.name} : {user.phone}
            </Text>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
        {isAdmin ? (
          <ButtonRow>
            <View style={{ flex: 1 }}>
              <Button
                label={isAdminEditing ? 'Save Changes' : 'Save as Draft'}
                variant="outline"
                onPress={() => handleSave(isAdminEditing ? 'save' : 'draft')}
                loading={submitting === (isAdminEditing ? 'save' : 'draft')}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Publish Now"
                onPress={requestSubmit}
                loading={submitting === 'submit'}
                fullWidth
              />
            </View>
          </ButtonRow>
        ) : (
          <ButtonRow>
            <View style={{ flex: 1 }}>
              <Button
                label="Save as Draft"
                variant="outline"
                onPress={() => handleSave('draft')}
                loading={submitting === 'draft'}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Submit for Review"
                onPress={requestSubmit}
                loading={submitting === 'submit'}
                fullWidth
              />
            </View>
          </ButtonRow>
        )}
      </ScrollView>

      <Modal
        visible={previewVisible}
        animationType="slide"
        onRequestClose={() => setPreviewVisible(false)}>
        <ScreenContainer edges={['top', 'left', 'right', 'bottom']} backgroundColor="#FFFFFF">
          <View style={styles.previewHeader}>
            <IconButton icon="arrow-back" color="#171717" onPress={() => setPreviewVisible(false)} />
            <Text style={styles.previewHeaderTitle}>Preview</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewScrollContent}>
            <ArticleNewspaperLayout article={previewArticle} onImagePress={adjustPreviewImage} />
          </ScrollView>
          <View style={styles.previewFooter}>
            <Button
              label={isAdmin ? 'Confirm & Publish' : 'Confirm & Submit'}
              onPress={() => handleSave('submit')}
              loading={submitting === 'submit'}
              fullWidth
            />
          </View>
        </ScreenContainer>
      </Modal>

      <ImageCropModal
        visible={!!cropTarget}
        imageUri={cropTarget?.uri ?? null}
        imageWidth={cropTarget?.width ?? 1}
        imageHeight={cropTarget?.height ?? 1}
        aspect={null}
        preserveOriginal={cropTarget?.kind === 'ad'}
        onCancel={handleCropCancel}
        onCropComplete={handleCropComplete}
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
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  previewHeaderTitle: {
    color: '#171717',
    fontSize: 16,
    fontWeight: '700',
  },
  previewScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  previewScrollContent: {
    width: '100%',
    paddingBottom: 16,
  },
  previewFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCharCount: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
  sectionImageWrap: {
    aspectRatio: 4 / 3,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: 8,
  },
  sectionImagePreview: {
    width: '100%',
    height: '100%',
  },
  bannerWrap: {
    height: 160,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  reporterFooter: {
    marginTop: 20,
    padding: 14,
  },
  dateSection: {
    marginTop: 20,
  },
  dateButton: {
    minHeight: 48,
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
  reporterFooterText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  titleInput: {
    fontSize: 17,
    fontWeight: '700',
    borderWidth: 1,
    padding: 14,
    minHeight: 54,
  },
  bodyInput: {
    fontSize: 14.5,
    lineHeight: 22,
    borderWidth: 1,
    padding: 14,
    minHeight: 120,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imagesHeader: {
    marginTop: 20,
  },
  addImageTile: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  imageTile: {
    width: 76,
    height: 76,
    marginRight: 10,
  },
  imageThumb: {
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
