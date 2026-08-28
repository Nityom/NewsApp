import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, Image as RNImage, StyleSheet, Text, View } from 'react-native';

import { formatRegistrationDate, getCurrentPeriodLabel, usePublicationInfo } from '@/context/PublicationInfoContext';
import { ADMIN_PHONE } from '@/lib/adminProfile';
import { advertisementFrameRatio, advertisementOrientation, advertisementWidths } from '@/lib/advertisementLayout';
import { useAppTheme } from '@/theme';
import type { Article } from '@/types/models';
import { Icon } from './Icon';

const logoBanner = require('../../../assets/images/logoBanner.jpeg');
const PAPER = '#FFFFFF';
const INK = '#171717';
const MUTED_INK = '#606060';
const RULE = '#D7D7D7';
// Keeps full-width follow-up sections from pushing content onto a second page.
export const MAX_SECTION_BODY_CHARS = 500;
export const MAX_SINGLE_ARTICLE_WORDS = 600;
export const MAX_TWO_NEWS_BODY_WORDS = 300;
// Bounds on the auto-fit photo frame so very tall or very wide photos still fit the page cleanly.
const MIN_PHOTO_ASPECT = 0.68;
const MAX_PHOTO_ASPECT = 1.9;

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function truncateWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

export function plainArticleText(content: string) {
  return content
    .replace(/^(?:# |\- |> )/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/<u>([^<]+)<\/u>/g, '$1')
    .replace(/\[color=#[0-9a-f]{6}\]([\s\S]*?)\[\/color\]/gi, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

function renderInlineText(text: string, keyPrefix = 'inline'): ReactNode[] {
  const parts = text.split(/(\[color=#[0-9a-f]{6}\][\s\S]*?\[\/color\]|\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|<u>[^<]+<\/u>|\[[^\]]+\]\([^)]+\))/gi).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const colored = part.match(/^\[color=(#[0-9a-f]{6})\]([\s\S]*)\[\/color\]$/i);
    if (colored) {
      return <Text key={key} style={{ color: colored[1] }}>{renderInlineText(colored[2], key)}</Text>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={key} style={styles.bodyBold}>{renderInlineText(part.slice(2, -2), key)}</Text>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <Text key={key} style={styles.bodyItalic}>{renderInlineText(part.slice(1, -1), key)}</Text>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <Text key={key} style={styles.bodyStrike}>{renderInlineText(part.slice(2, -2), key)}</Text>;
    }
    if (part.startsWith('<u>') && part.endsWith('</u>')) {
      return <Text key={key} style={styles.bodyUnderline}>{renderInlineText(part.slice(3, -4), key)}</Text>;
    }
    const link = part.match(/^\[([^\]]+)\]\([^)]+\)$/);
    if (link) return <Text key={key} style={styles.bodyLink}>{renderInlineText(link[1], key)}</Text>;
    return part;
  });
}

function renderBodyLines(lines: string[], keyPrefix: string) {
  return lines.map((line, index) => {
    const key = `${keyPrefix}-${index}`;
    if (line.startsWith('# ')) {
      return <Text key={key} style={styles.bodyHeading}>{renderInlineText(line.slice(2), `heading-${key}`)}</Text>;
    }
    if (line.startsWith('- ')) {
      return (
        <View key={key} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={[styles.body, styles.bulletText]}>{renderInlineText(line.slice(2), `bullet-${key}`)}</Text>
        </View>
      );
    }
    const ordered = line.match(/^(\d+)\.\s+(.*)$/);
    if (ordered) {
      return (
        <View key={key} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>{ordered[1]}.</Text>
          <Text style={[styles.body, styles.bulletText]}>{renderInlineText(ordered[2], `ordered-${key}`)}</Text>
        </View>
      );
    }
    if (line.startsWith('> ')) {
      return <Text key={key} style={styles.bodyQuote}>{renderInlineText(line.slice(2), `quote-${key}`)}</Text>;
    }
    return <Text key={key} style={styles.body}>{renderInlineText(line, `body-${key}`)}</Text>;
  });
}

function renderCompactBodyLines(content: string, shareMode: boolean) {
  return content.split(/\n+/).filter(Boolean).map((line, index) => {
    const key = `compact-body-${index}`;
    const ordered = line.match(/^(\d+)\.\s+(.*)$/);
    if (line.startsWith('# ')) {
      return <Text key={key} style={[styles.storyBody, styles.compactBodyHeading, shareMode && styles.shareStoryBody]}>{renderInlineText(line.slice(2), key)}</Text>;
    }
    if (line.startsWith('- ')) {
      return <Text key={key} style={[styles.storyBody, shareMode && styles.shareStoryBody]}>• {renderInlineText(line.slice(2), key)}</Text>;
    }
    if (ordered) {
      return <Text key={key} style={[styles.storyBody, shareMode && styles.shareStoryBody]}>{ordered[1]}. {renderInlineText(ordered[2], key)}</Text>;
    }
    if (line.startsWith('> ')) {
      return <Text key={key} style={[styles.storyBody, styles.compactBodyQuote, shareMode && styles.shareStoryBody]}>{renderInlineText(line.slice(2), key)}</Text>;
    }
    return <Text key={key} style={[styles.storyBody, shareMode && styles.shareStoryBody]}>{renderInlineText(line, key)}</Text>;
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

  // Clamp extreme photo shapes so the frame never grows tall/wide enough to overflow the page.
  const frameRatio = fixedRatio ?? Math.min(MAX_PHOTO_ASPECT, Math.max(MIN_PHOTO_ASPECT, ratio));
  const imageStyle = [styles.autoImage, style, { aspectRatio: frameRatio, borderRadius: radius }];
  // The frame matches each photo's own shape and uses "contain", so photos are always shown whole — never cropped.
  if (!onPress) return (
    <Image
      source={{ uri }}
      style={imageStyle}
      contentFit="contain"
      transition={0}
    />
  );

  return (
    <Pressable onPress={onPress} style={imageStyle} accessibilityRole="button" accessibilityLabel="Adjust photo">
      <Image source={{ uri }} style={styles.editableImage} contentFit="contain" transition={0} />
      <View style={styles.editImageBadge}>
        <Icon name="crop-outline" size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

function AdImage({ uri, radius, width, frameRatio, onPress }: {
  uri: string;
  radius: number;
  width: `${number}%`;
  frameRatio: number;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Image
        source={{ uri }}
        style={styles.adImage}
        contentFit="contain"
        transition={0}
      />
      {onPress ? (
        <View style={styles.editImageBadge}>
          <Icon name="crop-outline" size={16} color="#FFFFFF" />
        </View>
      ) : null}
    </>
  );
  const containerStyle = [
    styles.adImageContainer,
    { width, aspectRatio: frameRatio },
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

function AdvertisementGrid({
  uris,
  radius,
  onImagePress,
}: {
  uris: string[];
  radius: number;
  onImagePress?: ArticleNewspaperLayoutProps['onImagePress'];
}) {
  const [ratios, setRatios] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    uris.forEach((uri, index) => {
      RNImage.getSize(uri, (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setRatios((current) => current[index] === width / height
            ? current
            : { ...current, [index]: width / height });
        }
      }, () => {});
    });
    return () => {
      cancelled = true;
    };
  }, [uris]);

  const resolvedRatios = uris.map((_, index) => ratios[index] ?? 16 / 9);
  const orientations = resolvedRatios.map(advertisementOrientation);
  const widths = advertisementWidths(resolvedRatios);
  const mixedPair = uris.length === 2 && orientations[0] !== orientations[1];

  return (
    <View style={[styles.adGrid, uris.length === 1 && styles.adGridSingle, mixedPair && styles.adGridMixed]}>
      {uris.map((uri, index) => {
        return (
          <AdImage
            key={`${uri}-${index}`}
            uri={uri}
            radius={radius}
            width={widths[index]}
            frameRatio={advertisementFrameRatio(resolvedRatios[index])}
            onPress={onImagePress ? () => onImagePress({ kind: 'ad', index, uri }) : undefined}
          />
        );
      })}
    </View>
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
  const phone = article.reporterPhone?.trim()
    || reporterPhone?.trim()
    || (article.reporterId === 'admin' ? ADMIN_PHONE : undefined);
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
            maxBodyWords={MAX_TWO_NEWS_BODY_WORDS}
            shareMode={shareMode}
            onImagePress={onImagePress ? () => onImagePress({ kind: 'banner', uri: article.banner }) : undefined}
          />
          <View style={styles.colDivider} />
          <CompactStory
            title={firstSection.title}
            image={firstSection.image ?? article.banner}
            content={firstSection.content}
            maxBodyWords={MAX_TWO_NEWS_BODY_WORDS}
            shareMode={shareMode}
            onImagePress={onImagePress ? () => onImagePress(firstSection.image
              ? { kind: 'section', sectionId: firstSection.id, uri: firstSection.image }
              : { kind: 'banner', uri: article.banner }) : undefined}
          />
        </View>
      ) : (
        <>
          {/* Headline */}
          <Text style={styles.title}>{renderInlineText(article.title, 'title')}</Text>
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

          {/* Single-column body, matching the reference layout */}
          <View style={styles.simpleBody}>
            {renderBodyLines(article.content.split(/\n+/).filter(Boolean), 'body')}
          </View>
        </>
      )}

      {/* Any further sections beyond the first stack below in full width */}
      {restSections.map((section) => {
        const sContent = truncate(plainArticleText(section.content), MAX_SECTION_BODY_CHARS);
        const sLines = sContent.split(/\n+/).filter(Boolean);
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
            <Text style={styles.sectionTitle}>{renderInlineText(section.title, `section-title-${section.id}`)}</Text>
            <View style={styles.headlineRule} />
            <View style={styles.simpleBody}>
              {renderBodyLines(sLines, `section-${section.id}`)}
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
        <>
          <View style={[styles.sectionDividerRule, shareMode && styles.shareSectionDividerRule]} />
          <View style={[styles.adSection, shareMode && styles.shareAdSection]}>
            <AdvertisementGrid
              uris={article.advertisements}
              radius={theme.radius.sm}
              onImagePress={onImagePress}
            />
          </View>
        </>
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
  /** Max words kept per article body in the two-story layout. */
  maxBodyWords?: number;
}

function CompactStory({
  title,
  image,
  content,
  footer,
  maxBodyWords,
  maxBodyChars,
  shareMode = false,
  onImagePress,
}: {
  title: string;
  image: string;
  content: string;
  footer?: string;
  maxBodyWords?: number;
  maxBodyChars?: number;
  shareMode?: boolean;
  onImagePress?: () => void;
}) {
  const theme = useAppTheme();
  const plainContent = plainArticleText(content);
  const withinWordLimit = maxBodyWords === undefined || plainContent.split(/\s+/).filter(Boolean).length <= maxBodyWords;
  const body = withinWordLimit
    ? content
    : truncateWords(plainContent, maxBodyWords);
  const displayedBody = maxBodyWords === undefined && plainContent.length > (maxBodyChars ?? MAX_SECTION_BODY_CHARS)
    ? truncate(plainContent, maxBodyChars ?? MAX_SECTION_BODY_CHARS)
    : body;

  return (
    <View style={[styles.storyColumn, shareMode && styles.shareStoryColumn]}>
      <Text style={[styles.storyTitle, shareMode && styles.shareStoryTitle]}>{renderInlineText(title, 'compact-title')}</Text>
      <View style={styles.headlineRule} />
      <AutoImage
        uri={image}
        style={[styles.storyImage, shareMode && styles.shareStoryImage]}
        radius={theme.radius.sm}
        fixedRatio={4 / 3}
        onPress={onImagePress}
      />
      <View>{renderCompactBodyLines(displayedBody, shareMode)}</View>
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
  maxBodyWords = 500,
}: TwoArticleNewspaperLayoutProps) {
  const [first, second] = articles;
  const byline = (article: Article) => {
    const phone = article.reporterPhone?.trim()
      || reporterPhone?.trim()
      || (article.reporterId === 'admin' ? ADMIN_PHONE : undefined);
    return `${article.reporterName}${phone ? ` : ${phone}` : ''}`;
  };
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
          maxBodyWords={maxBodyWords}
        />
        <View style={styles.colDivider} />
        <CompactStory
          title={second.title}
          image={second.banner}
          content={second.content}
          maxBodyWords={maxBodyWords}
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
    textAlign: 'justify',
  },
  fullImage: {
    width: '68%',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  fullImageWrap: {
    paddingHorizontal: 12,
  },
  simpleBody: {
    marginHorizontal: 12,
    marginTop: 6,
  },
  colDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: RULE,
    marginVertical: 2,
  },
  body: {
    color: INK,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
     textAlign: 'justify',
  },
  bodyBold: {
    fontWeight: '800',
  },
  bodyItalic: {
    fontStyle: 'italic',
  },
  bodyUnderline: {
    textDecorationLine: 'underline',
  },
  bodyStrike: {
    textDecorationLine: 'line-through',
  },
  bodyLink: {
    textDecorationLine: 'underline',
  },
  bodyHeading: {
    color: INK,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  bulletMark: {
    color: INK,
    width: 16,
    fontSize: 15,
    lineHeight: 21,
  },
  bulletText: {
    flex: 1,
  },
  bodyQuote: {
    color: MUTED_INK,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: RULE,
    paddingLeft: 8,
    marginBottom: 8,
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
  adImageContainer: {
    backgroundColor: PAPER,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  adGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adGridSingle: {
    justifyContent: 'center',
  },
  adGridMixed: {
    justifyContent: 'center',
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
    width: '68%',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: INK,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
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
    marginBottom: 3,
    textAlign: 'justify',
  },
  compactBodyHeading: {
    fontWeight: '800',
  },
  compactBodyQuote: {
    fontStyle: 'italic',
  },
  shareStoryBody: {
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'justify',
  },
  sectionDividerRule: {
    height: 2,
    backgroundColor: INK,
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  shareSectionDividerRule: {
    height: 2,
    marginHorizontal: 24,
    marginTop: 22,
    marginBottom: 6,
  },
  storyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RULE,
    paddingTop: 6,
    marginTop: 8,
  },
});
