import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';
import type { Article } from '@/types/models';

const logoBanner = require('../../../assets/images/logoBanner.jpeg');

interface ArticleNewspaperLayoutProps {
  article: Article;
  reporterPhone?: string;
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
export function ArticleNewspaperLayout({ article, reporterPhone }: ArticleNewspaperLayoutProps) {
  const theme = useAppTheme();
  const phone = article.reporterPhone ?? reporterPhone;

  return (
    <View>
      <Image source={logoBanner} style={styles.logoBanner} contentFit="contain" />

      <Image
        source={{ uri: article.banner }}
        style={[styles.newsPhoto, { borderRadius: theme.radius.md }]}
        contentFit="cover"
      />

      <Text style={[styles.title, { color: theme.colors.text }]}>{article.title}</Text>
      <Text style={[styles.body, { color: theme.colors.text }]}>{article.content}</Text>

      {article.images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {article.images.map((uri, i) => (
            <Image
              key={`${uri}-${i}`}
              source={{ uri }}
              style={[styles.galleryImage, { borderRadius: theme.radius.md }]}
              contentFit="cover"
            />
          ))}
        </ScrollView>
      ) : null}

      {article.advertisements.length > 0 ? (
        <View style={styles.adSection}>
          <Text style={[styles.adLabel, { color: theme.colors.textMuted }]}>Advertisement</Text>
          {article.advertisements.map((uri, i) => (
            <Image
              key={`${uri}-${i}`}
              source={{ uri }}
              style={[
                styles.adImage,
                { borderRadius: theme.radius.md, backgroundColor: theme.colors.backgroundSubtle },
              ]}
              contentFit="contain"
            />
          ))}
        </View>
      ) : null}

      <View
        style={[
          styles.footer,
          { borderTopColor: theme.colors.border, marginTop: 20 },
        ]}>
        <Text style={[styles.reporterLabel, { color: theme.colors.textMuted }]}>News Reporter</Text>
        <Text style={[styles.reporterName, { color: theme.colors.text }]}>
          {article.reporterName}
          {phone ? ` : ${phone}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoBanner: {
    width: '100%',
    aspectRatio: 2564 / 451,
  },
  newsPhoto: {
    width: '100%',
    height: 170,
    marginTop: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
  },
  gallery: {
    marginTop: 16,
  },
  galleryImage: {
    width: 220,
    aspectRatio: 4 / 3,
    marginRight: 10,
  },
  adSection: {
    marginTop: 20,
  },
  adLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  adImage: {
    width: '100%',
    height: 280,
    marginBottom: 10,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    alignItems: 'center',
  },
  reporterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reporterName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
});
