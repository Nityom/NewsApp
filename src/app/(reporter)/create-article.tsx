import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { allCategories } from '@/mocks/data';
import { useAppTheme } from '@/theme';
import type { Article, Category } from '@/types/models';

const formatTools: { icon: IconName; token: string; label: string }[] = [
  { icon: 'text', token: '# ', label: 'Heading' },
  { icon: 'reorder-four', token: '\n- ', label: 'Bullet' },
  { icon: 'chatbox-ellipses-outline', token: '"', label: 'Quote' },
  { icon: 'link', token: '[link]', label: 'Link' },
];

export default function CreateArticleScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { articles, addArticle, updateArticle } = useArticles();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingDraft = useMemo(
    () => (params.id ? articles.find((a) => a.id === params.id) : undefined),
    [params.id, articles],
  );

  const [banner, setBanner] = useState<string | undefined>(editingDraft?.banner);
  const [title, setTitle] = useState(editingDraft?.title ?? '');
  const [category, setCategory] = useState<Category>(editingDraft?.category ?? 'Education');
  const [content, setContent] = useState(editingDraft?.content ?? '');
  const [images, setImages] = useState<string[]>(editingDraft?.images ?? []);
  const [advertisements, setAdvertisements] = useState<string[]>(editingDraft?.advertisements ?? []);
  const [submitting, setSubmitting] = useState<'draft' | 'submit' | null>(null);

  const pickImage = async (mode: 'banner' | 'gallery' | 'ad') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: mode !== 'ad',
      aspect: mode === 'banner' ? [16, 9] : mode === 'gallery' ? [4, 3] : undefined,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;

    if (mode === 'banner') {
      setBanner(result.assets[0]?.uri);
    } else if (mode === 'gallery') {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    } else {
      setAdvertisements((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const insertToken = (token: string) => setContent((prev) => `${prev}${token}`);

  const handleSave = async (kind: 'draft' | 'submit') => {
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
    const status = kind === 'draft' ? 'draft' : 'pending';

    try {
      if (editingDraft) {
        await updateArticle(editingDraft.id, {
          title,
          summary: content.slice(0, 140),
          content,
          banner,
          images,
          advertisements,
          category,
          status,
          reporterPhone: user?.phone ?? editingDraft.reporterPhone,
          updatedAt: now,
          submittedAt: kind === 'submit' ? now : editingDraft.submittedAt,
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
          category,
          status,
          reporterId: user?.id ?? 'unknown',
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
      Alert.alert(
        kind === 'draft' ? 'Saved to Drafts' : 'Submitted for Review',
        kind === 'draft'
          ? 'Your article has been saved as a draft.'
          : 'Your article has been submitted to the editorial team for review.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      setSubmitting(null);
      Alert.alert('Something went wrong', 'Could not save the article. Please try again.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="close" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {editingDraft ? 'Edit Article' : 'New Article'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>News Photo</Text>
        <View
          style={[
            styles.bannerWrap,
            { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
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

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 16 }]}>
          Category
        </Text>
        <View style={styles.chipsRow}>
          {allCategories.map((cat) => (
            <Chip key={cat} label={cat} selected={cat === category} onPress={() => setCategory(cat)} />
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          Article Body
        </Text>
        <View
          style={[
            styles.toolbar,
            { backgroundColor: theme.colors.backgroundSubtle, borderRadius: theme.radius.md },
          ]}>
          {formatTools.map((tool) => (
            <IconButton key={tool.label} icon={tool.icon} size={18} onPress={() => insertToken(tool.token)} />
          ))}
        </View>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Start writing your story..."
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.bodyInput,
            { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: theme.radius.md },
          ]}
          multiline
          textAlignVertical="top"
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
              onPress={() => handleSave('submit')}
              loading={submitting === 'submit'}
              fullWidth
            />
          </View>
        </ButtonRow>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  toolbar: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  bodyInput: {
    fontSize: 14.5,
    lineHeight: 22,
    borderWidth: 1,
    padding: 14,
    minHeight: 200,
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
