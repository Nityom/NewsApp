import { doc, getDoc, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { db, stripUndefined } from '@/lib/firebase';

const DOC_PATH = 'settings/publicationInfo';

const MARATHI_MONTHS = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर',
];

/** Current month + year, e.g. "ऑगस्ट 2026" — always reflects today's date. */
export function getCurrentPeriodLabel(date: Date = new Date()) {
  return `${MARATHI_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Formats an ISO date string as d/mm/yyyy for the दिनांक field. */
export function formatRegistrationDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export interface PublicationInfo {
  /** वर्ष */
  year: string;
  /** अंक */
  issueNumber: string;
  /** मूल्य */
  price: string;
}

const DEFAULT_INFO: PublicationInfo = {
  year: '2',
  issueNumber: '1',
  price: 'निःशुल्क',
};

interface PublicationInfoContextValue {
  info: PublicationInfo;
  isLoading: boolean;
  updateInfo: (patch: Partial<PublicationInfo>) => Promise<void>;
}

const PublicationInfoContext = createContext<PublicationInfoContextValue | null>(null);

export function PublicationInfoProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<PublicationInfo>(DEFAULT_INFO);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, DOC_PATH),
      (snapshot) => {
        if (snapshot.exists()) setInfo({ ...DEFAULT_INFO, ...(snapshot.data() as PublicationInfo) });
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  // One-time on app start: seed the document if it doesn't exist yet.
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDoc(doc(db, DOC_PATH));
        if (!snapshot.exists()) await setDoc(doc(db, DOC_PATH), DEFAULT_INFO);
      } catch {
        // best-effort - the app still works from whatever the live listener has
      }
    })();
  }, []);

  const updateInfo = useCallback(
    async (patch: Partial<PublicationInfo>) => {
      const next = { ...info, ...patch };
      setInfo(next);
      await setDoc(doc(db, DOC_PATH), stripUndefined(next));
    },
    [info],
  );

  return (
    <PublicationInfoContext.Provider value={{ info, isLoading, updateInfo }}>
      {children}
    </PublicationInfoContext.Provider>
  );
}

export function usePublicationInfo() {
  const ctx = useContext(PublicationInfoContext);
  if (!ctx) throw new Error('usePublicationInfo must be used within a PublicationInfoProvider');
  return ctx;
}
