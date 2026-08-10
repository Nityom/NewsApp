import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ArticleNewspaperLayout, MAX_SECTION_BODY_CHARS } from '@/components/ui/ArticleNewspaperLayout';
import { BlogTextEditor } from '@/components/ui/BlogTextEditor';
import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';
import type { Article, ArticleSection } from '@/types/models';

const articleSummary = (value: string) =>
  value
    .replace(/^(?:# |\- |> )/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

export default function CreateArticleScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
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

  const isAdminEditing = user?.role === 'admin' && !!editingDraft;

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
  const [cropTarget, setCropTarget] = useState<{
    uri: string;
    width: number;
    height: number;
    kind: 'banner' | 'gallery' | 'section';
    sectionId?: string;
  } | null>(null);

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
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;

    if (mode === 'ad') {
      setAdvertisements((prev) => [...prev, asset.uri]);
    } else {
      setCropTarget({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        kind: mode,
      });
    }
  };

  const addSection = () => {
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
      setImages((prev) => [...prev, uri]);
    } else if (cropTarget.sectionId) {
      updateSection(cropTarget.sectionId, { image: uri });
    }
    setCropTarget(null);
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
    const status = kind === 'draft' ? 'draft' : kind === 'submit' ? 'pending' : editingDraft?.status ?? 'pending';
    const cleanSections = sections.filter((s) => s.title.trim() || s.content.trim() || s.image);

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
          views: 0,
          likes: 0,
          readTimeMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 200)),
        };
        await addArticle(newArticle);
      }

      setSubmitting(null);
      const messages: Record<typeof kind, [string, string]> = {
        draft: ['Saved to Drafts', 'Your article has been saved as a draft.'],
        submit: ['Submitted for Review', 'Your article has been submitted to the editorial team for review.'],
        save: ['Changes Saved', 'The article has been updated.'],
      };
      const [title_, message] = messages[kind];
      setPreviewVisible(false);
      Alert.alert(title_, message, [{ text: 'OK', onPress: () => router.back() }]);
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
      views: editingDraft?.views ?? 0,
      likes: editingDraft?.likes ?? 0,
      readTimeMinutes: Math.max(1, Math.round(content.split(/\s+/).length / 200)),
    }),
    [editingDraft, title, content, banner, images, advertisements, sections, reporter?.id, user],
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
            onCursorPosition={(offsetY) => {
              pageScrollRef.current?.scrollTo({
                y: Math.max(0, editorTopRef.current + offsetY - 180),
                animated: true,
              });
            }}
          />
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
              onChangeText={(text) => updateSection(section.id, { content: text })}
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
                {
                  color:
                    section.content.length > MAX_SECTION_BODY_CHARS ? theme.colors.danger : theme.colors.textMuted,
                },
              ]}>
              {Math.min(section.content.length, MAX_SECTION_BODY_CHARS)}/{MAX_SECTION_BODY_CHARS} characters shown on the page
              {section.content.length > MAX_SECTION_BODY_CHARS ? ' — rest will be trimmed' : ''}
            </Text>
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
              {user.name} : {user.phone}
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
            <ArticleNewspaperLayout article={previewArticle} />
          </ScrollView>
          <View style={styles.previewFooter}>
            <Button
              label="Confirm & Submit"
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
        onCancel={() => setCropTarget(null)}
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
