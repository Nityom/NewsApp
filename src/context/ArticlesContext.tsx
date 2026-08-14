import { useMutation, useQuery } from 'convex/react';
import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';

import { uploadLocalFile, uploadLocalFiles } from '@/lib/cloudinary';
import type { Article } from '@/types/models';
import { api } from '@convex/_generated/api';

import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationsContext';

const COLLECTION = 'articles';

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
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const result = useQuery(api.articles.list, user ? {} : 'skip') as Article[] | undefined;
  const articles = useMemo(
    () => [...(result ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [result],
  );
  const isLoading = !!user && result === undefined;
  const upsertArticle = useMutation(api.articles.upsert);
  const patchArticle = useMutation(api.articles.patch);
  const removeArticle = useMutation(api.articles.remove);

  const getArticle = useCallback((id: string) => articles.find((a) => a.id === id), [articles]);

  const addArticle = useCallback(
    async (article: Article) => {
      const resolved = { ...article, ...(await resolveArticleImages(article.id, article)) } as Article;
      await upsertArticle({ article: resolved });
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
    [addNotification, upsertArticle],
  );

  const updateArticle = useCallback(
    async (id: string, patch: Partial<Article>) => {
      const previous = articles.find((a) => a.id === id);
      const resolvedPatch = await resolveArticleImages(id, patch);
      await patchArticle({ id, patch: resolvedPatch });

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
            reporterId: previous.reporterId,
          });
        } else if (patch.status === 'rejected') {
          await addNotification({
            type: 'article_rejected',
            audience: 'reporter',
            title: 'Article Needs Changes',
            message: `Your article "${title}" was rejected.${patch.rejectionReason ? ` Reason: ${patch.rejectionReason}` : ' Tap to view feedback.'}`,
            articleId: id,
            reporterId: previous.reporterId,
          });
        }
      }
    },
    [articles, addNotification, patchArticle],
  );

  const deleteArticle = useCallback(async (id: string) => {
    await removeArticle({ id });
  }, [removeArticle]);

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
