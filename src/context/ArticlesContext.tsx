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

import { uploadLocalFile, uploadLocalFiles } from '@/lib/cloudinary';
import { db, stripUndefined } from '@/lib/firebase';
import { mockArticles } from '@/mocks/data';
import type { Article } from '@/types/models';

import { useNotifications } from './NotificationsContext';

const COLLECTION = 'articles';
// Approved articles are removed after this many days to save on Firestore reads/storage.
// Their Cloudinary images are not deleted (unsigned uploads can't be deleted client-side securely).
const APPROVED_RETENTION_DAYS = 10;

interface ArticlesContextValue {
  articles: Article[];
  isLoading: boolean;
  getArticle: (id: string) => Article | undefined;
  addArticle: (article: Article) => Promise<void>;
  updateArticle: (id: string, patch: Partial<Article>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
}

const ArticlesContext = createContext<ArticlesContextValue | null>(null);

/** Uploads any local file:// URIs on the given article fields to Cloudinary and returns their URLs. */
async function resolveArticleImages(articleId: string, data: Partial<Article>): Promise<Partial<Article>> {
  const next: Partial<Article> = { ...data };
  if (data.banner) {
    next.banner = await uploadLocalFile(data.banner, `articles/${articleId}`);
  }
  if (data.images) {
    next.images = await uploadLocalFiles(data.images, `articles/${articleId}/images`);
  }
  if (data.advertisements) {
    next.advertisements = await uploadLocalFiles(data.advertisements, `articles/${articleId}/ads`);
  }
  if (data.sections) {
    next.sections = await Promise.all(
      data.sections.map(async (section) => ({
        ...section,
        image: section.image
          ? await uploadLocalFile(section.image, `articles/${articleId}/sections`)
          : section.image,
      })),
    );
  }
  return next;
}

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setArticles(snapshot.docs.map((d) => d.data() as Article));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  // One-time on app start: seed the collection if it's empty, and clean up long-approved articles.
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, COLLECTION));
        if (snapshot.empty) {
          const batch = writeBatch(db);
          mockArticles.forEach((article) => batch.set(doc(db, COLLECTION, article.id), article));
          await batch.commit();
          return;
        }

        const cutoff = Date.now() - APPROVED_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const stale = snapshot.docs.filter((d) => {
          const data = d.data() as Article;
          return data.status === 'approved' && data.reviewedAt && new Date(data.reviewedAt).getTime() < cutoff;
        });
        await Promise.all(stale.map((d) => deleteDoc(d.ref)));
      } catch {
        // best-effort - the app still works from whatever the live listener has
      }
    })();
  }, []);

  const getArticle = useCallback((id: string) => articles.find((a) => a.id === id), [articles]);

  const addArticle = useCallback(
    async (article: Article) => {
      const resolved = { ...article, ...(await resolveArticleImages(article.id, article)) } as Article;
      await setDoc(doc(db, COLLECTION, article.id), stripUndefined(resolved));
      if (article.status === 'pending') {
        await addNotification({
          type: 'article_pending',
          audience: 'admin',
          title: 'New Article Submitted',
          message: `${article.reporterName} submitted "${article.title}" for review.`,
          articleId: article.id,
        });
      }
    },
    [addNotification],
  );

  const updateArticle = useCallback(
    async (id: string, patch: Partial<Article>) => {
      const previous = articles.find((a) => a.id === id);
      const resolvedPatch = await resolveArticleImages(id, patch);
      await updateDoc(doc(db, COLLECTION, id), stripUndefined(resolvedPatch));

      if (previous && patch.status && patch.status !== previous.status) {
        const title = patch.title ?? previous.title;
        if (patch.status === 'pending') {
          await addNotification({
            type: 'article_pending',
            audience: 'admin',
            title: 'New Article Submitted',
            message: `${previous.reporterName} submitted "${title}" for review.`,
            articleId: id,
          });
        } else if (patch.status === 'approved') {
          await addNotification({
            type: 'article_approved',
            audience: 'reporter',
            title: 'Article Approved',
            message: `Your article "${title}" was approved and published.`,
            articleId: id,
          });
        } else if (patch.status === 'rejected') {
          await addNotification({
            type: 'article_rejected',
            audience: 'reporter',
            title: 'Article Needs Changes',
            message: `Your article "${title}" was rejected.${patch.rejectionReason ? ` Reason: ${patch.rejectionReason}` : ' Tap to view feedback.'}`,
            articleId: id,
          });
        }
      }
    },
    [articles, addNotification],
  );

  const deleteArticle = useCallback(async (id: string) => {
    await deleteDoc(doc(db, COLLECTION, id));
  }, []);

  const value = useMemo<ArticlesContextValue>(
    () => ({ articles, isLoading, getArticle, addArticle, updateArticle, deleteArticle }),
    [articles, isLoading, getArticle, addArticle, updateArticle, deleteArticle],
  );

  return <ArticlesContext.Provider value={value}>{children}</ArticlesContext.Provider>;
}

export function useArticles() {
  const ctx = useContext(ArticlesContext);
  if (!ctx) throw new Error('useArticles must be used within an ArticlesProvider');
  return ctx;
}
