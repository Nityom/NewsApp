import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { mockNotifications } from '@/mocks/data';
import type { AppNotification } from '@/types/models';

const STORAGE_KEY = 'enr:notifications';

interface NotificationsContextValue {
  notifications: AppNotification[];
  isLoading: boolean;
  getForAudience: (audience: 'reporter' | 'admin') => AppNotification[];
  unreadCount: (audience: 'reporter' | 'admin') => number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setNotifications(JSON.parse(raw));
        } else {
          setNotifications(mockNotifications);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mockNotifications));
        }
      } catch {
        setNotifications(mockNotifications);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: AppNotification[]) => {
    setNotifications(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addNotification = useCallback(
    async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
      const next: AppNotification = {
        ...notification,
        id: `ntf-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      await persist([next, ...notifications]);
    },
    [notifications, persist],
  );

  const markRead = useCallback(
    async (id: string) => {
      await persist(notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    },
    [notifications, persist],
  );

  const getForAudience = useCallback(
    (audience: 'reporter' | 'admin') => notifications.filter((n) => n.audience === audience),
    [notifications],
  );

  const unreadCount = useCallback(
    (audience: 'reporter' | 'admin') => notifications.filter((n) => n.audience === audience && !n.isRead).length,
    [notifications],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, isLoading, getForAudience, unreadCount, addNotification, markRead }),
    [notifications, isLoading, getForAudience, unreadCount, addNotification, markRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
