import { useMutation, useQuery } from 'convex/react';
import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';

import { uploadLocalFile } from '@/lib/cloudinary';
import type { Reporter } from '@/types/models';
import { api } from '@convex/_generated/api';

import { useAuth } from './AuthContext';

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

function reporterIdAliases(reporter: Reporter) {
  const emailSlug = reporter.email.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return [`rep-${emailSlug}`, `reporter-${emailSlug}`];
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
  const { user } = useAuth();
  const result = useQuery(api.reporters.list, user ? {} : 'skip') as Reporter[] | undefined;
  const visibleRawReporters = useMemo(
    () => (result ?? []).filter((reporter) => !MOCK_REPORTER_IDS.has(reporter.id)),
    [result],
  );
  const visibleReporters = useMemo(() => dedupeByEmail(visibleRawReporters), [visibleRawReporters]);
  const isLoading = !!user && result === undefined;
  const upsertReporter = useMutation(api.reporters.upsert);
  const patchReporter = useMutation(api.reporters.patch);
  const removeReporter = useMutation(api.reporters.remove);

  const getReporter = useCallback(
    (id: string) => {
      const direct = visibleReporters.find((r) => r.id === id);
      if (direct) return direct;
      // The id may belong to an older duplicate that dedupeByEmail filtered out (e.g. a stale
      // notification deep-link) - resolve it to that person's current canonical record instead.
      const stale = visibleRawReporters.find((r) => r.id === id);
      if (stale) return visibleReporters.find((r) => r.email.toLowerCase() === stale.email.toLowerCase());
      return visibleReporters.find((reporter) => reporterIdAliases(reporter).includes(id));
    },
    [visibleReporters, visibleRawReporters],
  );
  const getReporterByEmail = useCallback(
    (email: string) => visibleReporters.find((r) => r.email.toLowerCase() === email.toLowerCase()),
    [visibleReporters],
  );

  const addReporter = useCallback(async (reporter: Reporter) => {
    const resolved = { ...reporter, ...(await resolveReporterPhoto(reporter.id, reporter)) } as Reporter;
    await upsertReporter({ reporter: resolved });
  }, [upsertReporter]);

  const updateReporter = useCallback(async (id: string, patch: Partial<Reporter>) => {
    const resolvedPatch = await resolveReporterPhoto(id, patch);
    await patchReporter({ id, patch: resolvedPatch });
    return resolvedPatch;
  }, [patchReporter]);

  const deleteReporter = useCallback(async (id: string) => {
    await removeReporter({ id });
  }, [removeReporter]);

  const value = useMemo<ReportersContextValue>(
    () => ({ reporters: visibleReporters, isLoading, getReporter, getReporterByEmail, addReporter, updateReporter, deleteReporter }),
    [visibleReporters, isLoading, getReporter, getReporterByEmail, addReporter, updateReporter, deleteReporter],
  );

  return <ReportersContext.Provider value={value}>{children}</ReportersContext.Provider>;
}

export function useReporters() {
  const ctx = useContext(ReportersContext);
  if (!ctx) throw new Error('useReporters must be used within a ReportersProvider');
  return ctx;
}
