import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { mockArticles } from '@/mocks/data';
import type { Article } from '@/types/models';

import { useNotifications } from './NotificationsContext';

const STORAGE_KEY = 'enr:articles';

interface ArticlesContextValue {
  articles: Article[];
  isLoading: boolean;
  getArticle: (id: string) => Article | undefined;
  addArticle: (article: Article) => Promise<void>;
  updateArticle: (id: string, patch: Partial<Article>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
}

const ArticlesContext = createContext<ArticlesContextValue | null>(null);

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setArticles(JSON.parse(raw));
        } else {
          setArticles(mockArticles);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockArticles));
        }
      } catch {
        setArticles(mockArticles);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Article[]) => {
    setArticles(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const getArticle = useCallback((id: string) => articles.find((a) => a.id === id), [articles]);

  const addArticle = useCallback(
    async (article: Article) => {
      await persist([article, ...articles]);
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
    [articles, persist, addNotification],
  );

  const updateArticle = useCallback(
    async (id: string, patch: Partial<Article>) => {
      const previous = articles.find((a) => a.id === id);
      await persist(articles.map((a) => (a.id === id ? { ...a, ...patch } : a)));

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
    [articles, persist, addNotification],
  );

  const deleteArticle = useCallback(
    async (id: string) => {
      await persist(articles.filter((a) => a.id !== id));
    },
    [articles, persist],
  );

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
