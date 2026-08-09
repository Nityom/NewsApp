import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
} from '@react-native-firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { uploadLocalFile } from '@/lib/cloudinary';
import { db, stripUndefined } from '@/lib/firebase';
import type { Reporter } from '@/types/models';

const COLLECTION = 'reporters';
const MOCK_REPORTER_IDS = new Set(Array.from({ length: 10 }, (_, index) => `rep-${index + 1}`));

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
  updateReporter: (id: string, patch: Partial<Reporter>) => Promise<Partial<Reporter>>;
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
  const [rawReporters, setRawReporters] = useState<Reporter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        const mockDocuments = snapshot.docs.filter((reporterDoc) => MOCK_REPORTER_IDS.has(reporterDoc.id));
        const all = snapshot.docs
          .filter((reporterDoc) => !MOCK_REPORTER_IDS.has(reporterDoc.id))
          .map((reporterDoc) => reporterDoc.data() as Reporter);
        setRawReporters(all);
        setReporters(dedupeByEmail(all));
        setIsLoading(false);
        if (mockDocuments.length > 0) {
          Promise.all(mockDocuments.map((reporterDoc) => deleteDoc(reporterDoc.ref))).catch(() => {});
        }
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  const getReporter = useCallback(
    (id: string) => {
      const direct = reporters.find((r) => r.id === id);
      if (direct) return direct;
      // The id may belong to an older duplicate that dedupeByEmail filtered out (e.g. a stale
      // notification deep-link) - resolve it to that person's current canonical record instead.
      const stale = rawReporters.find((r) => r.id === id);
      return stale ? reporters.find((r) => r.email.toLowerCase() === stale.email.toLowerCase()) : undefined;
    },
    [reporters, rawReporters],
  );
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
    setRawReporters((current) => current.map((reporter) =>
      reporter.id === id ? { ...reporter, ...resolvedPatch } : reporter,
    ));
    setReporters((current) => dedupeByEmail(current.map((reporter) =>
      reporter.id === id ? { ...reporter, ...resolvedPatch } : reporter,
    )));
    return resolvedPatch;
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
