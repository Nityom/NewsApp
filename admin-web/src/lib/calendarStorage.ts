import type { CalendarProject } from '../types/calendar';
import { ENGLISH_MONTHS } from '../types/calendar';

const DB_NAME = 'newsapp_publications_db';
const DB_VERSION = 3;
const STORE_CALENDARS = 'calendar_projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('publications')) {
        db.createObjectStore('publications', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ad_presets')) {
        db.createObjectStore('ad_presets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CALENDARS)) {
        db.createObjectStore(STORE_CALENDARS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Initial Starter Sample Calendar
export const defaultCalendarProject: CalendarProject = {
  id: 'cal_2026_bhalerao_sample',
  title: 'Bhalerao Calendar 2026',
  year: 2026,
  description: '12 Month Calendar with customizable sponsor ad borders.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  months: ENGLISH_MONTHS.map((monthName, idx) => {
    // Provide sample background image for known months, or placeholder
    let bg = '';
    if (idx === 1) bg = '/WhatsApp Image 2026-10-26 at 1.11.49 PM-2.jpeg'; // Feb
    else if (idx === 6) bg = '/WhatsApp Image 2026-10-26 at 8.05.55 PM.jpeg'; // July
    else if (idx === 7) bg = '/WhatsApp Image 2026-10-26 at 1.11.49 PM.jpeg'; // Aug
    else if (idx === 9) bg = '/WhatsApp Image 2026-10-26 at 8.05.55 PM-2.jpeg'; // Oct

    return {
      id: `month_${idx + 1}`,
      monthIndex: idx,
      monthName,
      backgroundImageUrl: bg,
      outerBorderWidth: 160,
      outerBorderHeight: 80,
      showLeftBorder: true,
      showRightBorder: true,
      showTopBorder: true,
      showBottomBorder: true,
      ads: [],
    };
  }),
};

export async function getAllCalendars(): Promise<CalendarProject[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CALENDARS, 'readonly');
      const store = tx.objectStore(STORE_CALENDARS);
      const request = store.getAll();

      request.onsuccess = async () => {
        let items: CalendarProject[] = request.result || [];
        if (items.length === 0) {
          await saveCalendar(defaultCalendarProject);
          items = [defaultCalendarProject];
        }
        items.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get calendars from IndexedDB:', error);
    return [defaultCalendarProject];
  }
}

export async function getCalendar(id: string): Promise<CalendarProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CALENDARS, 'readonly');
      const store = tx.objectStore(STORE_CALENDARS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to get calendar ${id}:`, error);
    return null;
  }
}

export async function saveCalendar(cal: CalendarProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CALENDARS, 'readwrite');
    const store = tx.objectStore(STORE_CALENDARS);
    const updated = { ...cal, updatedAt: Date.now() };
    const request = store.put(updated);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCalendar(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CALENDARS, 'readwrite');
    const store = tx.objectStore(STORE_CALENDARS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function duplicateCalendar(id: string): Promise<CalendarProject | null> {
  const original = await getCalendar(id);
  if (!original) return null;

  const clone: CalendarProject = {
    ...original,
    id: `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `${original.title} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    months: original.months.map((m, idx) => ({
      ...m,
      id: `m_${Date.now()}_${idx}`,
      ads: m.ads.map((a) => ({
        ...a,
        id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
    })),
  };

  await saveCalendar(clone);
  return clone;
}
