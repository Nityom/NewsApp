import type { AdPreset, Publication } from '../types/publication';
import { defaultPublications } from './defaultPublications';

const DB_NAME = 'newsapp_publications_db';
const DB_VERSION = 3;
const STORE_PUBLICATIONS = 'publications';
const STORE_AD_PRESETS = 'ad_presets';
const STORE_CALENDARS = 'calendar_projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PUBLICATIONS)) {
        db.createObjectStore(STORE_PUBLICATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AD_PRESETS)) {
        db.createObjectStore(STORE_AD_PRESETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CALENDARS)) {
        db.createObjectStore(STORE_CALENDARS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllPublications(): Promise<Publication[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PUBLICATIONS, 'readonly');
      const store = tx.objectStore(STORE_PUBLICATIONS);
      const request = store.getAll();

      request.onsuccess = async () => {
        let items: Publication[] = request.result || [];
        if (items.length === 0) {
          // Initialize with default template on first run
          for (const pub of defaultPublications) {
            await savePublication(pub);
          }
          items = defaultPublications;
        }
        items.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get publications from IndexedDB:', error);
    return defaultPublications;
  }
}

export async function getPublication(id: string): Promise<Publication | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PUBLICATIONS, 'readonly');
      const store = tx.objectStore(STORE_PUBLICATIONS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Failed to get publication ${id}:`, error);
    return null;
  }
}

export async function savePublication(pub: Publication): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PUBLICATIONS, 'readwrite');
    const store = tx.objectStore(STORE_PUBLICATIONS);
    const updated = { ...pub, updatedAt: Date.now() };
    const request = store.put(updated);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deletePublication(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PUBLICATIONS, 'readwrite');
    const store = tx.objectStore(STORE_PUBLICATIONS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function duplicatePublication(id: string): Promise<Publication | null> {
  const original = await getPublication(id);
  if (!original) return null;

  const clone: Publication = {
    ...original,
    id: `pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `${original.title} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: original.pages.map((p, idx) => ({
      ...p,
      id: `page_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    })),
  };

  await savePublication(clone);
  return clone;
}

// Reusable Ad Presets
export async function getAllAdPresets(): Promise<AdPreset[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AD_PRESETS, 'readonly');
      const store = tx.objectStore(STORE_AD_PRESETS);
      const request = store.getAll();

      request.onsuccess = () => {
        const presets: AdPreset[] = request.result || [];
        presets.sort((a, b) => b.createdAt - a.createdAt);
        resolve(presets);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get ad presets:', err);
    return [];
  }
}

export async function saveAdPreset(preset: AdPreset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AD_PRESETS, 'readwrite');
    const store = tx.objectStore(STORE_AD_PRESETS);
    const request = store.put(preset);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAdPreset(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AD_PRESETS, 'readwrite');
    const store = tx.objectStore(STORE_AD_PRESETS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
