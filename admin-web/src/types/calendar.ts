export type CalendarAdPlacement =
  | 'top_banner'
  | 'right_column'
  | 'bottom_strip'
  | 'left_column'
  | 'empty_cell'
  | 'custom';

/** Where the ad lives — inside the calendar page OR in outer border frame */
export type CalendarAdZone = 'inner' | 'outer';

export interface CalendarAdElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
  /** Multiple images for auto-scrolling ads */
  images?: string[];
  /** Auto-scroll interval in seconds (default: 3.5) */
  scrollInterval?: number;
  /** Auto-scroll transition mode: 'carousel' (slide/fade) or 'marquee' (continuous glide) */
  scrollMode?: 'carousel' | 'marquee';
  label?: string;
  fit?: 'fill' | 'cover' | 'contain';
  placementType?: CalendarAdPlacement;
  /** 'inner' = overlaid ON the calendar page; 'outer' = in the surrounding border frame */
  zone?: CalendarAdZone;
  zIndex?: number;
}


export interface CalendarMonth {
  id: string;
  monthIndex: number; // 0 to 11
  monthName: string;
  backgroundImageUrl: string;
  ads: CalendarAdElement[];
  /** Width in px of the outer border columns (left, right) around the central calendar */
  outerBorderWidth?: number;  // default 160 (left/right)
  /** Height in px of the outer border strips (top, bottom) around the central calendar */
  outerBorderHeight?: number; // default 80 (top/bottom)
  /** Checkbox toggles to enable/disable each border margin */
  showLeftBorder?: boolean;
  showRightBorder?: boolean;
  showTopBorder?: boolean;
  showBottomBorder?: boolean;
  /** Optional independent column widths & strip heights */
  outerBorderLeft?: number;
  outerBorderRight?: number;
  outerBorderTop?: number;
  outerBorderBottom?: number;
}

export interface CalendarProject {
  id: string;
  title: string;
  year: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
  months: CalendarMonth[];
}

export type ReminderTag = 'important' | 'festival' | 'personal' | 'meeting' | 'reminder';

export interface CalendarReminder {
  id: string;
  calendarId: string;
  year: number;
  monthIndex: number; // 0 to 11
  day: number; // 1 to 31
  time?: string; // e.g. "09:30"
  title: string;
  note?: string;
  tag: ReminderTag;
  completed?: boolean;
  createdAt: number;
  notifyBrowser?: boolean; // Option 1
  notifyGoogleCalendar?: boolean; // Option 2
}

// Legacy – kept for backward compat but no longer used as default month names
export const MARATHI_MONTHS = [
  'January',   // was: जानेवारी
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
