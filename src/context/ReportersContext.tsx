import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    setDoc,
    updateDoc,
    writeBatch,
} from '@react-native-firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { uploadLocalFile } from '@/lib/cloudinary';
import { db, stripUndefined } from '@/lib/firebase';
import { mockReporters } from '@/mocks/data';
import type { Reporter } from '@/types/models';

const COLLECTION = 'reporters';

/**
 * Keeps only the newest record per email. Guards against stale duplicate documents left over
 * from before join-request IDs were made stable per account (e.g. retried submissions that used
 * to create a new doc each time instead of overwriting one).
 */
function dedupeByEmail(list: Reporter[]): Reporter[] {
  const byEmail = new Map<string, Reporter>();
  for (const reporter of list) {
    const key = reporter.email.toLowerCase();
    const existing = byEmail.get(key);
    if (!existing || new Date(reporter.joinedAt).getTime() > new Date(existing.joinedAt).getTime()) {
      byEmail.set(key, reporter);
    }
  }
  return Array.from(byEmail.values());
}

interface ReportersContextValue {
  reporters: Reporter[];
  isLoading: boolean;
  getReporter: (id: string) => Reporter | undefined;
  getReporterByEmail: (email: string) => Reporter | undefined;
  addReporter: (reporter: Reporter) => Promise<void>;
  updateReporter: (id: string, patch: Partial<Reporter>) => Promise<void>;
  deleteReporter: (id: string) => Promise<void>;
}

const ReportersContext = createContext<ReportersContextValue | null>(null);

/** Uploads a local file:// join-request photo to Cloudinary and returns its URL. */
async function resolveReporterPhoto(reporterId: string, data: Partial<Reporter>): Promise<Partial<Reporter>> {
  const next: Partial<Reporter> = { ...data };
  if (data.photo) {
    next.photo = await uploadLocalFile(data.photo, `reporters/${reporterId}`);
    if (data.avatar === data.photo) next.avatar = next.photo;
  }
  return next;
}

export function ReportersProvider({ children }: { children: ReactNode }) {
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setReporters(dedupeByEmail(snapshot.docs.map((d) => d.data() as Reporter)));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  // One-time on app start: seed the collection if it's empty.
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, COLLECTION));
        if (snapshot.empty) {
          const batch = writeBatch(db);
          mockReporters.forEach((reporter) => batch.set(doc(db, COLLECTION, reporter.id), reporter));
          await batch.commit();
        }
      } catch {
        // best-effort - the app still works from whatever the live listener has
      }
    })();
  }, []);

  const getReporter = useCallback((id: string) => reporters.find((r) => r.id === id), [reporters]);
  const getReporterByEmail = useCallback(
    (email: string) => reporters.find((r) => r.email.toLowerCase() === email.toLowerCase()),
    [reporters],
  );

  const addReporter = useCallback(async (reporter: Reporter) => {
    const resolved = { ...reporter, ...(await resolveReporterPhoto(reporter.id, reporter)) } as Reporter;
    await setDoc(doc(db, COLLECTION, reporter.id), stripUndefined(resolved));
  }, []);

  const updateReporter = useCallback(async (id: string, patch: Partial<Reporter>) => {
    const resolvedPatch = await resolveReporterPhoto(id, patch);
    await updateDoc(doc(db, COLLECTION, id), stripUndefined(resolvedPatch));
  }, []);

  const deleteReporter = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  const value = useMemo<ReportersContextValue>(
    () => ({ reporters, isLoading, getReporter, getReporterByEmail, addReporter, updateReporter, deleteReporter }),
    [reporters, isLoading, getReporter, getReporterByEmail, addReporter, updateReporter, deleteReporter],
  );

  return <ReportersContext.Provider value={value}>{children}</ReportersContext.Provider>;
}

export function useReporters() {
  const ctx = useContext(ReportersContext);
  if (!ctx) throw new Error('useReporters must be used within a ReportersProvider');
  return ctx;
}
