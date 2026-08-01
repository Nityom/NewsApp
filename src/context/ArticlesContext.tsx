import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { mockArticles } from '@/mocks/data';
import type { Article } from '@/types/models';

const STORAGE_KEY = 'enr:articles';

interface ArticlesContextValue {
  articles: Article[];
  isLoading: boolean;
  getArticle: (id: string) => Article | undefined;
  addArticle: (article: Article) => Promise<void>;
  updateArticle: (id: string, patch: Partial<Article>) => Promise<void>;
}

const ArticlesContext = createContext<ArticlesContextValue | null>(null);

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    },
    [articles, persist],
  );

  const updateArticle = useCallback(
    async (id: string, patch: Partial<Article>) => {
      await persist(articles.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [articles, persist],
  );

  const value = useMemo<ArticlesContextValue>(
    () => ({ articles, isLoading, getArticle, addArticle, updateArticle }),
    [articles, isLoading, getArticle, addArticle, updateArticle],
  );

  return <ArticlesContext.Provider value={value}>{children}</ArticlesContext.Provider>;
}

export function useArticles() {
  const ctx = useContext(ArticlesContext);
  if (!ctx) throw new Error('useArticles must be used within an ArticlesProvider');
  return ctx;
}
