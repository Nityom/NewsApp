import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, Image as RNImage, StyleSheet, Text, View } from 'react-native';

import { formatRegistrationDate, getCurrentPeriodLabel, usePublicationInfo } from '@/context/PublicationInfoContext';
import { useAppTheme } from '@/theme';
import type { Article } from '@/types/models';
import { Icon } from './Icon';

const logoBanner = require('../../../assets/images/logoBanner.jpeg');
const PAPER = '#FFFFFF';
const INK = '#171717';
const MUTED_INK = '#606060';
const RULE = '#D7D7D7';
// Keeps an additional article (added via the "+" section button) from pushing content onto a second page.
export const MAX_SECTION_BODY_CHARS = 500;

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function plainArticleText(content: string) {
  return content
    .replace(/^(?:# |\- |> )/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

function renderInlineText(text: string, keyPrefix = 'inline'): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={key} style={styles.bodyBold}>{renderInlineText(part.slice(2, -2), key)}</Text>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <Text key={key} style={styles.bodyItalic}>{renderInlineText(part.slice(1, -1), key)}</Text>;
    }
    return part;
  });
}

function ArticleBody({ content }: { content: string }) {
  return content.split(/\n+/).filter(Boolean).map((line, index) => {
    if (line.startsWith('# ')) {
      return <Text key={index} style={styles.bodyHeading}>{renderInlineText(line.slice(2), `heading-${index}`)}</Text>;
    }
    if (line.startsWith('- ')) {
      return (
        <View key={index} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={[styles.body, styles.bulletText]}>{renderInlineText(line.slice(2), `bullet-${index}`)}</Text>
        </View>
      );
    }
    if (line.startsWith('> ')) {
      return <Text key={index} style={styles.bodyQuote}>{renderInlineText(line.slice(2), `quote-${index}`)}</Text>;
    }
    return <Text key={index} style={styles.body}>{renderInlineText(line, `body-${index}`)}</Text>;
  });
}

interface ArticleNewspaperLayoutProps {
  article: Article;
  reporterPhone?: string;
  shareMode?: boolean;
  onImagePress?: (target: {
    kind: 'banner' | 'gallery' | 'ad' | 'section';
    index?: number;
    sectionId?: string;
    uri: string;
  }) => void;
}

function AutoImage({
  uri,
  style,
  radius,
  fixedRatio,
  onPress,
}: {
  uri: string;
  style?: object;
  radius: number;
  fixedRatio?: number;
  onPress?: () => void;
}) {
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

  const imageStyle = [styles.autoImage, style, { aspectRatio: fixedRatio ?? ratio, borderRadius: radius }];
  if (!onPress) return (
    <Image
      source={{ uri }}
      style={imageStyle}
      contentFit={fixedRatio ? 'contain' : 'cover'}
      transition={0}
    />
  );

  return (
    <Pressable onPress={onPress} style={imageStyle} accessibilityRole="button" accessibilityLabel="Adjust photo">
      <Image source={{ uri }} style={styles.editableImage} contentFit={fixedRatio ? 'contain' : 'cover'} transition={0} />
      <View style={styles.editImageBadge}>
        <Icon name="crop-outline" size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

function AdImage({ uri, radius, wide, shareMode = false, onPress }: {
  uri: string;
  radius: number;
  wide: boolean;
  shareMode?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Image source={{ uri }} style={styles.adImage} contentFit="contain" transition={0} />
      {onPress ? (
        <View style={styles.editImageBadge}>
          <Icon name="crop-outline" size={16} color="#FFFFFF" />
        </View>
      ) : null}
    </>
  );
  const containerStyle = [
    styles.adImageContainer,
    wide ? styles.adImageContainerWide : styles.adImageContainerHalf,
    shareMode && (wide ? styles.shareAdImageWide : styles.shareAdImageHalf),
    { borderRadius: radius, overflow: 'hidden' as const },
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={containerStyle}
        accessibilityRole="button"
        accessibilityLabel="Adjust advertisement photo">
        {content}
      </Pressable>
    );
  }
  return (
    <View style={containerStyle}>{content}</View>
  );
}

function PublicationInfoBar({
  pageCount,
  registrationLabel,
  shareMode = false,
}: {
  pageCount: number;
  registrationLabel?: string;
  shareMode?: boolean;
}) {
  const { info } = usePublicationInfo();
  const period = getCurrentPeriodLabel();
  const registrationDate = registrationLabel ?? '—';

  return (
    <View style={[styles.infoBar, shareMode && styles.shareInfoBar]}>
      <Text
        style={[styles.infoBarText, shareMode && styles.shareInfoBarText]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={shareMode ? 0.85 : undefined}>
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
export function ArticleNewspaperLayout({ article, reporterPhone, shareMode = false, onImagePress }: ArticleNewspaperLayoutProps) {
  const theme = useAppTheme();
  const phone = article.reporterPhone ?? reporterPhone;
  const [firstSection, ...restSections] = article.sections ?? [];
  // Extra sections beyond the first stack as additional pages; the first shares the lead page.
  const pageCount = 1 + restSections.length;
  // registrationDate is a pre-formatted display string set/edited by admin; fall back to the approval date.
  const registrationLabel = article.registrationDate ?? (article.reviewedAt ? formatRegistrationDate(article.reviewedAt) : undefined);

  return (
    <View style={[styles.paper, shareMode && styles.sharePaper]}>
      {/* Masthead */}
      <Image source={logoBanner} style={styles.logoBanner} contentFit="contain" />
      <PublicationInfoBar pageCount={pageCount} registrationLabel={registrationLabel} shareMode={shareMode} />
      <View style={styles.mastRule} />

      {firstSection ? (
        // Additional article added via "+" — same side-by-side layout as the combined preview.
        // Reporter is the same for both, so the name is shown once in the page footer below.
        <View style={[styles.twoUpRow, shareMode && styles.shareTwoUpRow]}>
          <CompactStory
            title={article.title}
            image={article.banner}
            content={article.content}
            maxBodyChars={MAX_SECTION_BODY_CHARS}
            shareMode={shareMode}
            onImagePress={onImagePress ? () => onImagePress({ kind: 'banner', uri: article.banner }) : undefined}
          />
          <View style={styles.colDivider} />
          <CompactStory
            title={firstSection.title}
            image={firstSection.image ?? article.banner}
            content={firstSection.content}
            maxBodyChars={MAX_SECTION_BODY_CHARS}
            shareMode={shareMode}
            onImagePress={onImagePress ? () => onImagePress(firstSection.image
              ? { kind: 'section', sectionId: firstSection.id, uri: firstSection.image }
              : { kind: 'banner', uri: article.banner }) : undefined}
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
              onPress={onImagePress ? () => onImagePress({ kind: 'banner', uri: article.banner }) : undefined}
            />
          </View>

          {/* Single-column body */}
          <View style={styles.simpleBody}>
            <ArticleBody content={article.content} />
          </View>
        </>
      )}

      {/* Any further sections beyond the first stack below in full width */}
      {restSections.map((section) => {
        const sContent = truncate(plainArticleText(section.content), MAX_SECTION_BODY_CHARS);
        const sParas = sContent.split(/\n+/).filter(Boolean);
        const sMid = Math.ceil(sParas.length / 2);
        return (
          <View key={section.id} style={styles.sectionBlock}>
            {section.image ? (
              <AutoImage
                uri={section.image}
                style={styles.sectionImage}
                radius={theme.radius.sm}
                onPress={onImagePress ? () => onImagePress({ kind: 'section', sectionId: section.id, uri: section.image! }) : undefined}
              />
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
              <AutoImage
                uri={uri}
                style={styles.galleryImage}
                radius={theme.radius.sm}
                onPress={onImagePress ? () => onImagePress({ kind: 'gallery', index: i, uri }) : undefined}
              />
            </View>
          ))}
        </View>
      ) : null}

      {/* Advertisement */}
      {article.advertisements.length > 0 ? (
        <View style={[styles.adSection, shareMode && styles.shareAdSection]}>
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
                shareMode={shareMode}
                onPress={onImagePress ? () => onImagePress({ kind: 'ad', index: i, uri }) : undefined}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Footer */}
      <View style={[styles.footer, shareMode && styles.shareFooter]}>
        <Text style={[styles.reporterLabel, shareMode && styles.shareReporterLabel]}>News Reporter</Text>
        <Text style={[styles.reporterName, shareMode && styles.shareReporterName]}>
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
  shareMode = false,
  onImagePress,
}: {
  title: string;
  image: string;
  content: string;
  footer?: string;
  maxBodyChars: number;
  shareMode?: boolean;
  onImagePress?: () => void;
}) {
  const theme = useAppTheme();
  const body = truncate(plainArticleText(content), maxBodyChars);

  return (
    <View style={[styles.storyColumn, shareMode && styles.shareStoryColumn]}>
      <Text style={[styles.storyTitle, shareMode && styles.shareStoryTitle]}>{title}</Text>
      <View style={styles.headlineRule} />
      <AutoImage
        uri={image}
        style={[styles.storyImage, shareMode && styles.shareStoryImage]}
        radius={theme.radius.sm}
        fixedRatio={4 / 3}
        onPress={onImagePress}
      />
      <Text style={[styles.storyBody, shareMode && styles.shareStoryBody]}>{body}</Text>
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
  sharePaper: {
    paddingBottom: 12,
  },
  editableImage: {
    width: '100%',
    height: '100%',
  },
  editImageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(23,23,23,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
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
  shareInfoBar: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  infoBarText: {
    color: INK,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  shareInfoBarText: {
    fontSize: 13,
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
  bodyBold: {
    fontWeight: '800',
  },
  bodyItalic: {
    fontStyle: 'italic',
  },
  bodyHeading: {
    color: INK,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bulletMark: {
    color: INK,
    width: 14,
    fontSize: 13,
    lineHeight: 17,
  },
  bulletText: {
    flex: 1,
  },
  bodyQuote: {
    color: MUTED_INK,
    fontSize: 11,
    lineHeight: 17,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: RULE,
    paddingLeft: 8,
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
  shareAdSection: {
    marginTop: 22,
    marginHorizontal: 24,
    padding: 14,
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
  shareAdImageWide: {
    height: 240,
  },
  adImageContainerHalf: {
    width: '48.5%',
    height: 140,
    marginBottom: 8,
  },
  shareAdImageHalf: {
    height: 170,
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
  shareFooter: {
    paddingTop: 14,
    marginTop: 40,
    marginHorizontal: 24,
    gap: 4,
  },
  reporterLabel: {
    color: MUTED_INK,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  shareReporterLabel: {
    fontSize: 12,
    letterSpacing: 1.4,
  },
  reporterName: {
    color: INK,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  shareReporterName: {
    fontSize: 17,
  },
  twoUpRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    gap: 0,
  },
  shareTwoUpRow: {
    marginHorizontal: 18,
    marginTop: 12,
  },
  storyColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  shareStoryColumn: {
    paddingHorizontal: 10,
  },
  storyImage: {
    width: '100%',
    marginTop: 2,
    marginBottom: 6,
  },
  shareStoryImage: {
    marginTop: 6,
    marginBottom: 10,
  },
  storyTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  shareStoryTitle: {
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: 0,
  },
  storyBody: {
    color: INK,
    fontSize: 10.5,
    lineHeight: 15,
  },
  shareStoryBody: {
    fontSize: 16,
    lineHeight: 23,
  },
  storyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RULE,
    paddingTop: 6,
    marginTop: 8,
  },
});
