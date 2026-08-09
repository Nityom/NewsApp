import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';

import { formatRegistrationDate, getCurrentPeriodLabel, usePublicationInfo } from '@/context/PublicationInfoContext';
import { useAppTheme } from '@/theme';
import type { Article } from '@/types/models';

const logoBanner = require('../../../assets/images/logoBanner.jpeg');
const PAPER = '#FFFFFF';
const INK = '#171717';
const MUTED_INK = '#606060';
const RULE = '#D7D7D7';
const MIN_DISPLAY_RATIO = 3 / 4;
const MAX_DISPLAY_RATIO = 2;
// Keeps an additional article (added via the "+" section button) from pushing content onto a second page.
export const MAX_SECTION_BODY_CHARS = 500;

const displayRatio = (width: number, height: number) =>
  Math.min(MAX_DISPLAY_RATIO, Math.max(MIN_DISPLAY_RATIO, width / height));

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

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

function AdImage({ uri, radius, wide }: { uri: string; radius: number; wide: boolean }) {
  return (
    <View
      style={[
        styles.adImageContainer,
        wide ? styles.adImageContainerWide : styles.adImageContainerHalf,
        { borderRadius: radius, overflow: 'hidden' },
      ]}>
      <Image
        source={{ uri }}
        style={styles.adImage}
        contentFit="contain"
        transition={0}
      />
    </View>
  );
}

function PublicationInfoBar({ pageCount, registrationLabel }: { pageCount: number; registrationLabel?: string }) {
  const { info } = usePublicationInfo();
  const period = getCurrentPeriodLabel();
  const registrationDate = registrationLabel ?? '—';

  return (
    <View style={styles.infoBar}>
      <Text style={styles.infoBarText} numberOfLines={1} adjustsFontSizeToFit>
        वर्ष : {info.year}  |  अंक : {info.issueNumber}  |  {period}  (पृष्ठ : {pageCount})  |  दिनांक {registrationDate}  |  मूल्य : {info.price}
      </Text>
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
  const [firstSection, ...restSections] = article.sections ?? [];
  // Extra sections beyond the first stack as additional pages; the first shares the lead page.
  const pageCount = 1 + restSections.length;
  // registrationDate is a pre-formatted display string set/edited by admin; fall back to the approval date.
  const registrationLabel = article.registrationDate ?? (article.reviewedAt ? formatRegistrationDate(article.reviewedAt) : undefined);

  return (
    <View style={styles.paper}>
      {/* Masthead */}
      <Image source={logoBanner} style={styles.logoBanner} contentFit="contain" />
      <PublicationInfoBar pageCount={pageCount} registrationLabel={registrationLabel} />
      <View style={styles.mastRule} />

      {firstSection ? (
        // Additional article added via "+" — same side-by-side layout as the combined preview.
        // Reporter is the same for both, so the name is shown once in the page footer below.
        <View style={styles.twoUpRow}>
          <CompactStory
            title={article.title}
            image={article.banner}
            content={article.content}
            maxBodyChars={MAX_SECTION_BODY_CHARS}
          />
          <View style={styles.colDivider} />
          <CompactStory
            title={firstSection.title}
            image={firstSection.image ?? article.banner}
            content={firstSection.content}
            maxBodyChars={MAX_SECTION_BODY_CHARS}
          />
        </View>
      ) : (
        <>
          {/* Headline */}
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.headlineRule} />

          {/* Full-width photo */}
          <View style={styles.fullImageWrap}>
            <AutoImage
              uri={article.banner}
              style={styles.fullImage}
              radius={theme.radius.sm}
              fixedRatio={shareMode ? 4 / 3 : undefined}
            />
          </View>

          {/* Single-column body */}
          <View style={styles.simpleBody}>
            {paragraphs.map((para, i) => <Text key={i} style={styles.body}>{para}</Text>)}
          </View>
        </>
      )}

      {/* Any further sections beyond the first stack below in full width */}
      {restSections.map((section) => {
        const sContent = truncate(section.content.replace(/\n+/g, ' ').trim(), MAX_SECTION_BODY_CHARS);
        const sParas = sContent.split(/\n+/).filter(Boolean);
        const sMid = Math.ceil(sParas.length / 2);
        return (
          <View key={section.id} style={styles.sectionBlock}>
            {section.image ? (
              <AutoImage uri={section.image} style={styles.sectionImage} radius={theme.radius.sm} fixedRatio={16 / 9} />
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
              <AutoImage uri={uri} style={styles.galleryImage} radius={theme.radius.sm} fixedRatio={4 / 3} />
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
          <View style={styles.adGrid}>
            {article.advertisements.map((uri, i) => (
              <AdImage
                key={`${uri}-${i}`}
                uri={uri}
                radius={theme.radius.sm}
                wide={article.advertisements.length === 1}
              />
            ))}
          </View>
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

interface TwoArticleNewspaperLayoutProps {
  articles: [Article, Article];
  reporterPhone?: string;
  /** Max characters kept per article body when squeezing two stories onto one page. */
  maxBodyChars?: number;
}

function CompactStory({
  title,
  image,
  content,
  footer,
  maxBodyChars,
}: {
  title: string;
  image: string;
  content: string;
  footer?: string;
  maxBodyChars: number;
}) {
  const theme = useAppTheme();
  const body = truncate(content.replace(/\n+/g, ' ').trim(), maxBodyChars);

  return (
    <View style={styles.storyColumn}>
      <Text style={styles.storyTitle}>{title}</Text>
      <View style={styles.headlineRule} />
      <AutoImage uri={image} style={styles.storyImage} radius={theme.radius.sm} fixedRatio={4 / 3} />
      <Text style={styles.storyBody}>{body}</Text>
      {footer ? (
        <View style={styles.storyFooter}>
          <Text style={styles.reporterName}>{footer}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Two stories sharing a single masthead, laid out side by side.
 * Each story's text is truncated so both fit on one page.
 */
export function TwoArticleNewspaperLayout({
  articles,
  reporterPhone,
  maxBodyChars = 420,
}: TwoArticleNewspaperLayoutProps) {
  const [first, second] = articles;
  const byline = (a: Article) => `${a.reporterName}${(a.reporterPhone ?? reporterPhone) ? ` : ${a.reporterPhone ?? reporterPhone}` : ''}`;
  // Collapse into one line when both stories share the same reporter.
  const bylines = Array.from(new Set([byline(first), byline(second)]));
  const registrationLabel =
    first.registrationDate ??
    second.registrationDate ??
    (first.reviewedAt ? formatRegistrationDate(first.reviewedAt) : undefined) ??
    (second.reviewedAt ? formatRegistrationDate(second.reviewedAt) : undefined);

  return (
    <View style={styles.paper}>
      <Image source={logoBanner} style={styles.logoBanner} contentFit="contain" />
      <PublicationInfoBar pageCount={1} registrationLabel={registrationLabel} />
      <View style={styles.mastRule} />

      <View style={styles.twoUpRow}>
        <CompactStory
          title={first.title}
          image={first.banner}
          content={first.content}
          maxBodyChars={maxBodyChars}
        />
        <View style={styles.colDivider} />
        <CompactStory
          title={second.title}
          image={second.banner}
          content={second.content}
          maxBodyChars={maxBodyChars}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.reporterLabel}>News Reporter{bylines.length > 1 ? 's' : ''}</Text>
        {bylines.map((line) => (
          <Text key={line} style={styles.reporterName}>{line}</Text>
        ))}
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
  infoBar: {
    backgroundColor: '#FFE600',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: INK,
    marginHorizontal: 12,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  infoBarText: {
    color: INK,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
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
  fullImage: {
    width: '100%',
    marginTop: 4,
    marginBottom: 10,
  },
  fullImageWrap: {
    paddingHorizontal: 12,
  },
  simpleBody: {
    marginHorizontal: 12,
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
    backgroundColor: PAPER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  adImageContainerWide: {
    width: '100%',
    height: 200,
    marginBottom: 4,
  },
  adImageContainerHalf: {
    width: '48.5%',
    height: 140,
    marginBottom: 8,
  },
  adGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
  twoUpRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    gap: 0,
  },
  storyColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  storyImage: {
    width: '100%',
    marginTop: 2,
    marginBottom: 6,
  },
  storyTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  storyBody: {
    color: INK,
    fontSize: 10.5,
    lineHeight: 15,
  },
  storyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RULE,
    paddingTop: 6,
    marginTop: 8,
  },
});
