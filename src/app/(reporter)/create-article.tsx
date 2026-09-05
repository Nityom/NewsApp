import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ArticleNewspaperLayout,
  MAX_SINGLE_ARTICLE_WORDS,
  MAX_TWO_NEWS_BODY_WORDS,
} from '@/components/ui/ArticleNewspaperLayout';
import { BlogTextEditor, countArticleWords, limitArticleWords } from '@/components/ui/BlogTextEditor';
import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { useReporters } from '@/context/ReportersContext';
import { ADMIN_PHONE } from '@/lib/adminProfile';
import { useAppTheme } from '@/theme';
import type { Article, ArticleSection } from '@/types/models';

export default function CreateArticleScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { articles, addArticle, updateArticle } = useArticles();
  const { getReporter, getReporterByEmail } = useReporters();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingDraft = useMemo(
    () => (params.id ? articles.find((a) => a.id === params.id) : undefined),
    [params.id, articles],
  );

  const isAdminEditing = user?.role === 'admin' && !!editingDraft;
  const isAdmin = user?.role === 'admin';
  const authorReporter = editingDraft
    ? getReporter(editingDraft.reporterId)
    : user?.email ? getReporterByEmail(user.email) : undefined;
  const resolvedAuthorPhone = editingDraft?.reporterPhone?.trim()
    || authorReporter?.phone.trim()
    || user?.phone?.trim()
    || (isAdmin ? ADMIN_PHONE : undefined);

  const [articleMode, setArticleMode] = useState<'single' | 'two'>(
    editingDraft?.sections && editingDraft.sections.length > 0 ? 'two' : 'single',
  );
  const [banner, setBanner] = useState<string | undefined>(editingDraft?.banner);
  const [title, setTitle] = useState(editingDraft?.title ?? '');
  const [content, setContent] = useState(editingDraft?.content ?? '');
  const [images, setImages] = useState<string[]>(editingDraft?.images ?? []);
  const [advertisements, setAdvertisements] = useState<string[]>(editingDraft?.advertisements ?? []);
  const [sections, setSections] = useState<ArticleSection[]>(editingDraft?.sections ?? []);
  const [submitting, setSubmitting] = useState<'draft' | 'submit' | 'save' | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const authorPhone = resolvedAuthorPhone;
  const authorName = editingDraft?.reporterName ?? user?.name ?? 'Unknown Reporter';

  const pickImage = async (mode: 'banner' | 'gallery' | 'ad') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: mode === 'ad' ? 1 : 0.9,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    if (mode === 'banner') {
      setBanner(asset.uri);
    } else if (mode === 'gallery') {
      setImages((prev) => [...prev, asset.uri]);
    } else {
      setAdvertisements((prev) => [...prev, asset.uri]);
    }
  };

  const isTwoNews = articleMode === 'two';
  const limitSingleNewsBody = (value: string) => limitArticleWords(value, MAX_SINGLE_ARTICLE_WORDS);
  const limitTwoNewsBody = (value: string) => limitArticleWords(value, MAX_TWO_NEWS_BODY_WORDS);

  const selectMode = (mode: 'single' | 'two') => {
    setArticleMode(mode);
    if (mode === 'single') {
      setContent((current) => limitSingleNewsBody(current));
      setSections([]);
    } else {
      setContent((current) => limitTwoNewsBody(current));
      setSections((prev) => {
        if (prev.length === 0) {
          return [{ id: `sec-${Date.now()}`, title: '', content: '' }];
        }
        return prev.map((s, index) => (index === 0 ? { ...s, content: limitTwoNewsBody(s.content) } : s));
      });
    }
  };

  const addSection = () => {
    setArticleMode('two');
    setContent((current) => limitTwoNewsBody(current));
    setSections((prev) => [...prev, { id: `sec-${Date.now()}`, title: '', content: '' }]);
  };

  const updateSection = (id: string, patch: Partial<ArticleSection>) => {
    setSections((prev) => prev.map((s, index) => {
      if (s.id !== id) return s;
      const next = { ...s, ...patch };
      return index === 0 && patch.content !== undefined
        ? { ...next, content: limitTwoNewsBody(patch.content) }
        : next;
    }));
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
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    updateSection(id, { image: asset.uri });
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
    setSubmitting(kind);
    const now = new Date().toISOString();
    const status = kind === 'draft'
      ? 'draft'
      : kind === 'submit'
        ? (isAdmin ? 'approved' : 'pending')
        : editingDraft?.status ?? (isAdmin ? 'approved' : 'pending');
    const cleanSections = sections.filter((s) => s.title.trim() || s.content.trim() || s.image);

    try {
      if (editingDraft) {
        await updateArticle(editingDraft.id, {
          title,
          summary: content.slice(0, 140),
          content,
          banner,
          images,
          advertisements,
          sections: cleanSections,
          reporterPhone: authorPhone,
          status,
          updatedAt: now,
          submittedAt: kind === 'submit' ? now : editingDraft.submittedAt,
          reviewedAt: kind === 'submit' && isAdmin ? now : editingDraft.reviewedAt,
        });
      } else {
        const newArticle: Article = {
          id: `art-${Date.now()}`,
          title,
          summary: content.slice(0, 140),
          content,
          banner,
          images,
          advertisements,
          sections: cleanSections,
          status,
          reporterId: user?.id ?? 'unknown',
          reporterName: user?.name ?? 'Unknown Reporter',
          reporterAvatar: user?.avatar ?? '',
          reporterPhone: authorPhone,
          createdAt: now,
          updatedAt: now,
          submittedAt: kind === 'submit' ? now : undefined,
          reviewedAt: kind === 'submit' && isAdmin ? now : undefined,
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
          ? ['Article Published', 'Your article has been approved and published.']
          : ['Submitted for Review', 'Your article has been submitted to the editorial team for review.'],
        save: ['Changes Saved', 'The article has been updated.'],
      };
      const [title_, message] = messages[kind];
      setPreviewVisible(false);
      Alert.alert(title_, message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      setSubmitting(null);
      Alert.alert('Something went wrong', 'Could not save the article. Please try again.');
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
      summary: content.slice(0, 140),
      content,
      banner: banner ?? '',
      images,
      advertisements,
      sections: sections.filter((s) => s.title.trim() || s.content.trim() || s.image),
      status: editingDraft?.status ?? (isAdmin ? 'approved' : 'pending'),
      reporterId: editingDraft?.reporterId ?? user?.id ?? 'unknown',
      reporterName: authorName,
      reporterAvatar: editingDraft?.reporterAvatar ?? user?.avatar ?? '',
      reporterPhone: authorPhone,
      createdAt: editingDraft?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: editingDraft?.views ?? 0,
      likes: editingDraft?.likes ?? 0,
      readTimeMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 200)),
    }),
    [editingDraft, title, content, banner, images, advertisements, sections, user, isAdmin, authorPhone, authorName],
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

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Top Mode Selector: 1 Article vs 2 Articles */}
        <View style={styles.modeSelectorWrap}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
            Article Layout & Word Limit
          </Text>
          <View style={styles.modeCardsRow}>
            <Pressable
              onPress={() => selectMode('single')}
              style={[
                styles.modeCard,
                {
                  borderColor: articleMode === 'single' ? theme.colors.primary : theme.colors.border,
                  backgroundColor: articleMode === 'single' ? (theme.mode === 'dark' ? '#3A2E05' : '#FEF9E7') : theme.colors.backgroundSubtle,
                  borderWidth: articleMode === 'single' ? 2 : 1,
                },
                articleMode === 'single' && styles.modeCardActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="1 Article Layout">
              <View style={styles.modeCardTop}>
                <View
                  style={[
                    styles.modeIconCircle,
                    { backgroundColor: articleMode === 'single' ? theme.colors.primary : theme.colors.border },
                  ]}>
                  <Icon
                    name="document-text"
                    size={16}
                    color={articleMode === 'single' ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                </View>
                <View
                  style={[
                    styles.modeBadge,
                    { backgroundColor: articleMode === 'single' ? theme.colors.primary : theme.colors.border },
                  ]}>
                  <Text
                    style={[
                      styles.modeBadgeText,
                      { color: articleMode === 'single' ? '#FFFFFF' : theme.colors.textMuted },
                    ]}>
                    {MAX_SINGLE_ARTICLE_WORDS}w max
                  </Text>
                </View>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.modeCardTitle,
                  { color: articleMode === 'single' ? theme.colors.text : theme.colors.textSecondary },
                ]}>
                1 Article
              </Text>
              <Text numberOfLines={1} style={[styles.modeCardSub, { color: theme.colors.textMuted }]}>
                Single Story
              </Text>
            </Pressable>

            <Pressable
              onPress={() => selectMode('two')}
              style={[
                styles.modeCard,
                {
                  borderColor: articleMode === 'two' ? theme.colors.primary : theme.colors.border,
                  backgroundColor: articleMode === 'two' ? (theme.mode === 'dark' ? '#3A2E05' : '#FEF9E7') : theme.colors.backgroundSubtle,
                  borderWidth: articleMode === 'two' ? 2 : 1,
                },
                articleMode === 'two' && styles.modeCardActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="2 Articles Layout">
              <View style={styles.modeCardTop}>
                <View
                  style={[
                    styles.modeIconCircle,
                    { backgroundColor: articleMode === 'two' ? theme.colors.primary : theme.colors.border },
                  ]}>
                  <Icon
                    name="newspaper"
                    size={16}
                    color={articleMode === 'two' ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                </View>
                <View
                  style={[
                    styles.modeBadge,
                    { backgroundColor: articleMode === 'two' ? theme.colors.primary : theme.colors.border },
                  ]}>
                  <Text
                    style={[
                      styles.modeBadgeText,
                      { color: articleMode === 'two' ? '#FFFFFF' : theme.colors.textMuted },
                    ]}>
                    {MAX_TWO_NEWS_BODY_WORDS}w ea
                  </Text>
                </View>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.modeCardTitle,
                  { color: articleMode === 'two' ? theme.colors.text : theme.colors.textSecondary },
                ]}>
                2 Articles
              </Text>
              <Text numberOfLines={1} style={[styles.modeCardSub, { color: theme.colors.textMuted }]}>
                Two Stories
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 14 }]}>
          {isTwoNews ? 'Article 1 Photo' : 'News Photo'}
        </Text>
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
          {isTwoNews ? 'Article 1 Title' : 'Title'}
        </Text>
        <BlogTextEditor initialValue={title} onChange={setTitle} variant="title" />

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          {isTwoNews
            ? `Article 1 Body (${countArticleWords(content)}/${MAX_TWO_NEWS_BODY_WORDS} words)`
            : `Article Body (${countArticleWords(content)}/${MAX_SINGLE_ARTICLE_WORDS} words)`}
        </Text>
        <BlogTextEditor
          initialValue={content}
          onChange={setContent}
          maxWords={isTwoNews ? MAX_TWO_NEWS_BODY_WORDS : MAX_SINGLE_ARTICLE_WORDS}
        />

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
            {isTwoNews ? `Additional Articles (${sections.length})` : `Additional Articles (${sections.length})`}
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
              <Text style={[styles.sectionCardLabel, { color: theme.colors.textMuted }]}>
                Article {i + 2} ({countArticleWords(section.content)}/{MAX_TWO_NEWS_BODY_WORDS} words)
              </Text>
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
            <View style={styles.sectionTitleEditor}>
              <BlogTextEditor
                initialValue={section.title}
                onChange={(sTitle) => updateSection(section.id, { title: sTitle })}
                variant="title"
              />
            </View>
            <View style={styles.sectionBodyEditor}>
              <BlogTextEditor
                initialValue={section.content}
                onChange={(sContent) => updateSection(section.id, { content: sContent })}
                maxWords={MAX_TWO_NEWS_BODY_WORDS}
              />
            </View>
          </View>
        ))}

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
              {authorName}{authorPhone ? ` : ${authorPhone}` : ''}
            </Text>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
        {isAdminEditing ? (
          <Button
            label="Save Changes"
            onPress={() => handleSave('save')}
            loading={submitting === 'save'}
            fullWidth
          />
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
                label={isAdmin ? 'Publish Now' : 'Submit for Review'}
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
            <ArticleNewspaperLayout article={previewArticle} />
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
  modeSelectorWrap: {
    marginBottom: 10,
  },
  modeCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  modeCardActive: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  modeCardSub: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  modeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
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
  sectionTitleEditor: {
    marginTop: 12,
  },
  sectionBodyEditor: {
    marginTop: 10,
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
