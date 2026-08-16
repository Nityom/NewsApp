import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';
import type { Article } from '@/types/models';

const logoBanner = require('../../../assets/images/logoBanner.jpeg');
const PAPER = '#FFFFFF';
const INK = '#171717';
const MUTED_INK = '#606060';
const RULE = '#D7D7D7';
const MIN_DISPLAY_RATIO = 3 / 4;
const MAX_DISPLAY_RATIO = 2;

const displayRatio = (width: number, height: number) =>
  Math.min(MAX_DISPLAY_RATIO, Math.max(MIN_DISPLAY_RATIO, width / height));

interface ArticleNewspaperLayoutProps {
  article: Article;
  reporterPhone?: string;
  shareMode?: boolean;
}

function AutoImage({
  uri,
  style,
  radius,
  fixedRatio,
}: {
  uri: string;
  style?: object;
  radius: number;
  fixedRatio?: number;
}) {
  const [ratio, setRatio] = useState(4 / 3);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setRatio(displayRatio(w, h));
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={[
        styles.autoImage,
        { aspectRatio: fixedRatio ?? ratio, borderRadius: radius },
        style,
      ]}
      contentFit="cover"
      transition={0}
    />
  );
}

function AdImage({ uri, radius }: { uri: string; radius: number }) {
  const [ratio, setRatio] = useState(4 / 3);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setRatio(w / h);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={[
        styles.adImage,
        { aspectRatio: ratio, borderRadius: radius },
      ]}
      contentFit="contain"
      transition={0}
    />
  );
}

/**
 * Newspaper-style article layout:
 * 1. Logo banner (masthead)
 * 2. News photo
 * 3. Headline + article body
 * 4. Additional uploaded photo(s)
 * 5. Advertisement photo(s)
 * 6. Reporter name + contact footer
 */
export function ArticleNewspaperLayout({ article, reporterPhone, shareMode = false }: ArticleNewspaperLayoutProps) {
  const theme = useAppTheme();
  const phone = article.reporterPhone ?? reporterPhone;

  return (
    <View style={styles.paper}>
      <Image source={logoBanner} style={styles.logoBanner} contentFit="contain" />

      <AutoImage
        uri={article.banner}
        style={styles.newsPhoto}
        radius={theme.radius.md}
        fixedRatio={shareMode ? 16 / 9 : undefined}
      />

      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.body}>{article.content}</Text>

      {article.sections?.map((section) => (
        <View key={section.id} style={styles.sectionBlock}>
          {section.image ? (
            <AutoImage
              uri={section.image}
              style={styles.sectionImage}
              radius={theme.radius.md}
              fixedRatio={shareMode ? 16 / 9 : undefined}
            />
          ) : null}
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.body}>{section.content}</Text>
        </View>
      ))}

      {article.images.length > 0 ? (
        <View style={styles.gallery}>
          {article.images.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.galleryItem}>
              <AutoImage
                uri={uri}
                style={styles.galleryImage}
                radius={theme.radius.md}
                fixedRatio={shareMode ? 4 / 3 : undefined}
              />
            </View>
          ))}
        </View>
      ) : null}

      {article.advertisements.length > 0 ? (
        <View style={styles.adSection}>
          <Text style={styles.adLabel}>Advertisement</Text>
          <View style={styles.adContainer}>
            {article.advertisements.map((uri, i) => (
              <View
                key={`${uri}-${i}`}
                style={article.advertisements.length === 1 ? styles.singleAd : styles.splitAd}
              >
                <AdImage uri={uri} radius={theme.radius.md} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.reporterLabel}>News Reporter</Text>
        <Text style={styles.reporterName}>
          {article.reporterName}
          {phone ? ` : ${phone}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: '100%',
    backgroundColor: PAPER,
    paddingBottom: 24,
  },
  logoBanner: {
    width: '100%',
    aspectRatio: 2564 / 451,
  },
  newsPhoto: {
    width: '100%',
    marginTop: 14,
  },
  title: {
    color: INK,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 16,
    marginHorizontal: 16,
  },
  body: {
    color: INK,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
    marginHorizontal: 16,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  galleryItem: {
    width: '50%',
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  galleryImage: {
    width: '100%',
  },
  adSection: {
    marginTop: 20,
  },
  adContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  singleAd: {
    width: '100%',
    paddingHorizontal: 2,
  },
  splitAd: {
    width: '50%',
    paddingHorizontal: 2,
  },
  adLabel: {
    color: MUTED_INK,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  adImage: {
    width: '100%',
    marginBottom: 10,
  },
  autoImage: {
    width: '100%',
    backgroundColor: PAPER,
    opacity: 1,
  },
  sectionBlock: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RULE,
  },
  sectionImage: {
    width: '100%',
    marginBottom: 12,
  },
  sectionTitle: {
    color: INK,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginHorizontal: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RULE,
    paddingTop: 12,
    marginTop: 20,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  reporterLabel: {
    color: MUTED_INK,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reporterName: {
    color: INK,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
});
