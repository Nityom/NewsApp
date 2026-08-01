import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { mockReporters } from '@/mocks/data';
import type { Reporter } from '@/types/models';

const STORAGE_KEY = 'enr:reporters';

interface ReportersContextValue {
  reporters: Reporter[];
  isLoading: boolean;
  getReporter: (id: string) => Reporter | undefined;
  updateReporter: (id: string, patch: Partial<Reporter>) => Promise<void>;
  deleteReporter: (id: string) => Promise<void>;
}

const ReportersContext = createContext<ReportersContextValue | null>(null);

export function ReportersProvider({ children }: { children: ReactNode }) {
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setReporters(JSON.parse(raw));
        } else {
          setReporters(mockReporters);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockReporters));
        }
      } catch {
        setReporters(mockReporters);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Reporter[]) => {
    setReporters(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const getReporter = useCallback((id: string) => reporters.find((r) => r.id === id), [reporters]);

  const updateReporter = useCallback(
    async (id: string, patch: Partial<Reporter>) => {
      await persist(reporters.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [reporters, persist],
  );

  const deleteReporter = useCallback(
    async (id: string) => {
      await persist(reporters.filter((r) => r.id !== id));
    },
    [reporters, persist],
  );

  const value = useMemo<ReportersContextValue>(
    () => ({ reporters, isLoading, getReporter, updateReporter, deleteReporter }),
    [reporters, isLoading, getReporter, updateReporter, deleteReporter],
  );

  return <ReportersContext.Provider value={value}>{children}</ReportersContext.Provider>;
}

export function useReporters() {
  const ctx = useContext(ReportersContext);
  if (!ctx) throw new Error('useReporters must be used within a ReportersProvider');
  return ctx;
}
