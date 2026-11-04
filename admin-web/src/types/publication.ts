export type PageType = 'cover' | 'inner' | 'back' | 'ad_full';

export interface PageAd {
  type: 'image' | 'none';
  imageUrl?: string;
  name?: string;
  fit?: 'fill' | 'cover' | 'contain';
}

export interface CanvasElement {
  id: string;
  type: 'feature_image' | 'ad_image';
  x: number; // in px on the 595px sheet
  y: number; // in px on the 842px sheet
  width: number; // in px
  height: number; // in px
  zIndex?: number;
  imageUrl?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  label?: string;
}

export interface PublicationPage {
  id: string;
  pageNumber: number;
  type: PageType;
  title: string;
  titleColor?: string;
  titleAlign?: 'left' | 'center' | 'right';
  subtitle?: string;
  subtitleColor?: string;
  subtitleAlign?: 'left' | 'center' | 'right';
  reporterName?: string;
  reporterMode?: 'free' | 'bottom';
  reporterNameSize?: number;
  reporterNameColor?: string;
  reporterNameAlign?: 'left' | 'center' | 'right';
  reporterX?: number;
  reporterY?: number;
  reporterWidth?: number;
  reporterHeight?: number;
  content: string; // Devotional verses, news matter, editorial text
  fontSize: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'justify';
  continueOnNextPage?: boolean;
  continuationPageId?: string;
  continuationSourceContent?: string;
  continuationCutIndex?: number;
  continuationFromPageId?: string;
  continuationNotice?: string;

  // Two-section / split page support (divide page into 2 stories with 2 headings and 2 contents)
  isSplitPage?: boolean;
  splitDirection?: 'horizontal' | 'vertical'; // 'horizontal' = side-by-side (2 columns), 'vertical' = top-and-bottom (2 rows)
  section2Title?: string;
  section2TitleColor?: string;
  section2TitleAlign?: 'left' | 'center' | 'right';
  section2Subtitle?: string;
  section2SubtitleColor?: string;
  section2SubtitleAlign?: 'left' | 'center' | 'right';
  section2Content?: string;
  section2ReporterName?: string;
  section2ReporterMode?: 'free' | 'bottom';
  section2ReporterNameSize?: number;
  section2ReporterNameColor?: string;
  section2ReporterNameAlign?: 'left' | 'center' | 'right';
  section2ReporterX?: number;
  section2ReporterY?: number;
  section2ReporterWidth?: number;
  section2ReporterHeight?: number;

  // Feature image (e.g. Deity, guest, event photo)
  featureImageUrl?: string;
  featureImagePosition?: 'right' | 'center' | 'left' | 'hero' | 'free';
  featureImageWidth?: number; // percentage or pixels
  featureImageX?: number; // Free draggable x coordinate
  featureImageY?: number; // Free draggable y coordinate
  featureImageHeight?: number; // Free draggable height

  // Greeting banner (special for cover or festive page)
  greetingText?: string;
  greetingBgColor?: string;

  // Header override for this specific page (defaults to publication master header)
  customHeaderTitle?: string;
  customHeaderRight?: string;

  // Bottom advertisement banner
  ad: PageAd;
  adMode?: 'bottom' | 'free' | 'none'; // bottom slot or freeform draggable
  adX?: number;
  adY?: number;
  adWidth?: number;
  adHeight?: number;

  // Canvas elements: any additional freeform ad images anywhere on the page!
  canvasElements?: CanvasElement[];

  // Aesthetics
  decorativeBorder?: boolean;
  paperTint?: string;
}

export interface PublicationMasterHeader {
  publicationName: string; // e.g. "Education News"
  tagline: string; // e.g. "Family Companion"
  editionTitle: string; // e.g. "Special Edition"
  centerLogoUrl?: string; // Emblem or logo icon
  headerImageUrl?: string;
  cityLocation: string; // e.g. "Wardha"
  issueDate: string; // e.g. "October 2026"
  themeColor: 'festive-red' | 'saffron-orange' | 'royal-blue' | 'maroon-gold' | 'custom';
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}

export interface Publication {
  id: string;
  title: string;
  category: string;
  createdAt: number;
  updatedAt: number;
  masterHeader: PublicationMasterHeader;
  pages: PublicationPage[];
  pageOrientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Tabloid';
}

export interface AdPreset {
  id: string;
  name: string;
  ad: PageAd;
  createdAt: number;
}
