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
        style,
        { aspectRatio: fixedRatio ?? ratio, borderRadius: radius },
      ]}
      contentFit="cover"
      transition={0}
    />
  );
}

function AdImage({ uri, radius }: { uri: string; radius: number }) {
  return (
    <View style={[styles.adImageContainer, { borderRadius: radius, overflow: 'hidden' }]}>
      <Image
        source={{ uri }}
        style={styles.adImage}
        contentFit="contain"
        transition={0}
      />
    </View>
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
  const paragraphs = article.content.split(/\n+/).filter(Boolean);
  // Split paragraphs: first shown beside image, rest in two columns
  const leadPara = paragraphs[0] ?? '';
  const bodyParas = paragraphs.slice(1);
  const mid = Math.ceil(bodyParas.length / 2);
  const leftCol = bodyParas.slice(0, mid);
  const rightCol = bodyParas.slice(mid);

  return (
    <View style={styles.paper}>
      {/* Masthead */}
      <Image source={logoBanner} style={styles.logoBanner} contentFit="contain" />
      <View style={styles.mastRule} />

      {/* Headline */}
      <Text style={styles.title}>{article.title}</Text>
      <View style={styles.headlineRule} />

      {/* Lead: image left + first paragraph right */}
      <View style={styles.leadRow}>
        <AutoImage
          uri={article.banner}
          style={styles.leadImage}
          radius={theme.radius.sm}
          fixedRatio={shareMode ? 4 / 3 : undefined}
        />
        <Text style={styles.leadPara}>{leadPara}</Text>
      </View>

      {/* Two-column body */}
      {bodyParas.length > 0 ? (
        <View style={styles.columns}>
          <View style={styles.column}>
            {leftCol.map((para, i) => <Text key={i} style={styles.body}>{para}</Text>)}
          </View>
          <View style={styles.colDivider} />
          <View style={styles.column}>
            {rightCol.map((para, i) => <Text key={i} style={styles.body}>{para}</Text>)}
          </View>
        </View>
      ) : null}

      {/* Sections */}
      {article.sections?.map((section) => {
        const sParas = section.content.split(/\n+/).filter(Boolean);
        const sMid = Math.ceil(sParas.length / 2);
        return (
          <View key={section.id} style={styles.sectionBlock}>
            {section.image ? (
              <AutoImage uri={section.image} style={styles.sectionImage} radius={theme.radius.sm} />
            ) : null}
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.headlineRule} />
            <View style={styles.columns}>
              <View style={styles.column}>
                {sParas.slice(0, sMid).map((p, i) => <Text key={i} style={styles.body}>{p}</Text>)}
              </View>
              <View style={styles.colDivider} />
              <View style={styles.column}>
                {sParas.slice(sMid).map((p, i) => <Text key={i} style={styles.body}>{p}</Text>)}
              </View>
            </View>
          </View>
        );
      })}

      {/* Gallery */}
      {article.images.length > 0 ? (
        <View style={styles.gallery}>
          {article.images.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.galleryItem}>
              <AutoImage uri={uri} style={styles.galleryImage} radius={theme.radius.sm} />
            </View>
          ))}
        </View>
      ) : null}

      {/* Advertisement */}
      {article.advertisements.length > 0 ? (
        <View style={styles.adSection}>
          <View style={styles.adLabelRow}>
            <View style={styles.adLabelLine} />
            <Text style={styles.adLabel}>Advertisement</Text>
            <View style={styles.adLabelLine} />
          </View>
          {article.advertisements.map((uri, i) => (
            <AdImage key={`${uri}-${i}`} uri={uri} radius={theme.radius.sm} />
          ))}
        </View>
      ) : null}

      {/* Footer */}
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
    paddingBottom: 20,
  },
  logoBanner: {
    width: '100%',
    aspectRatio: 2564 / 451,
  },
  mastRule: {
    height: 3,
    backgroundColor: INK,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  title: {
    color: INK,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headlineRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: INK,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  leadRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    gap: 8,
  },
  leadImage: {
    width: '45%',
    aspectRatio: 3 / 4,
  },
  leadPara: {
    flex: 1,
    color: INK,
    fontSize: 11,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  columns: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 6,
    gap: 0,
  },
  column: {
    flex: 1,
    paddingHorizontal: 4,
  },
  colDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: RULE,
    marginVertical: 2,
  },
  body: {
    color: INK,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 6,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  galleryItem: {
    width: '50%',
    paddingHorizontal: 3,
    paddingBottom: 6,
  },
  galleryImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  adSection: {
    marginTop: 16,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 4,
    padding: 10,
  },
  adLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  adLabelLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: RULE,
  },
  adLabel: {
    color: MUTED_INK,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  adImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: PAPER,
    marginBottom: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  autoImage: {
    width: '100%',
    backgroundColor: PAPER,
  },
  sectionBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: INK,
    marginHorizontal: 0,
  },
  sectionImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginBottom: 8,
  },
  sectionTitle: {
    color: INK,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    textTransform: 'uppercase',
    marginHorizontal: 12,
  },
  footer: {
    borderTopWidth: 2,
    borderTopColor: INK,
    paddingTop: 10,
    marginTop: 18,
    marginHorizontal: 12,
    alignItems: 'center',
    gap: 2,
  },
  reporterLabel: {
    color: MUTED_INK,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  reporterName: {
    color: INK,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
