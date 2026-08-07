import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'enr:publicationInfo';

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
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setInfo({ ...DEFAULT_INFO, ...JSON.parse(raw) });
      } catch {
        setInfo(DEFAULT_INFO);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateInfo = useCallback(
    async (patch: Partial<PublicationInfo>) => {
      const next = { ...info, ...patch };
      setInfo(next);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
