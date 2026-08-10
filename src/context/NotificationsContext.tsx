import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
} from '@react-native-firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { db, stripUndefined } from '@/lib/firebase';
import type { AppNotification } from '@/types/models';

const COLLECTION = 'notifications';
const MOCK_NOTIFICATION_IDS = new Set(Array.from({ length: 6 }, (_, index) => `ntf-${index + 1}`));

interface NotificationsContextValue {
  notifications: AppNotification[];
  isLoading: boolean;
  getForAudience: (audience: 'reporter' | 'admin') => AppNotification[];
  unreadCount: (audience: 'reporter' | 'admin') => number;
  getForReporter: (reporterIds?: string | string[]) => AppNotification[];
  unreadCountForReporter: (reporterIds?: string | string[]) => number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (ids: string[]) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        const mockDocuments = snapshot.docs.filter((notificationDoc) => MOCK_NOTIFICATION_IDS.has(notificationDoc.id));
        setNotifications(
          snapshot.docs
            .filter((notificationDoc) => !MOCK_NOTIFICATION_IDS.has(notificationDoc.id))
            .map((notificationDoc) => notificationDoc.data() as AppNotification)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        );
        setIsLoading(false);
        if (mockDocuments.length > 0) {
          Promise.all(mockDocuments.map((notificationDoc) => deleteDoc(notificationDoc.ref))).catch(() => {});
        }
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  const addNotification = useCallback(
    async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
      const id = `ntf-${Date.now()}-${Math.round(Math.random() * 1000)}`;
      const next: AppNotification = {
        ...notification,
        id,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      await setDoc(doc(db, COLLECTION, id), stripUndefined(next));
    },
    [],
  );

  const markRead = useCallback(async (id: string) => {
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
    );
    await updateDoc(doc(db, COLLECTION, id), { isRead: true });
  }, []);

  const markAllRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setNotifications((current) =>
      current.map((notification) => (idSet.has(notification.id) ? { ...notification, isRead: true } : notification)),
    );
    await Promise.all(ids.map((id) => updateDoc(doc(db, COLLECTION, id), { isRead: true })));
  }, []);

  const getForAudience = useCallback(
    (audience: 'reporter' | 'admin') => notifications.filter((n) => n.audience === audience),
    [notifications],
  );

  const unreadCount = useCallback(
    (audience: 'reporter' | 'admin') => notifications.filter((n) => n.audience === audience && !n.isRead).length,
    [notifications],
  );

  const getForReporter = useCallback(
    (reporterIds?: string | string[]) => {
      const ids = new Set(Array.isArray(reporterIds) ? reporterIds : reporterIds ? [reporterIds] : []);
      return ids.size > 0
        ? notifications.filter((notification) =>
            notification.audience === 'reporter' && !!notification.reporterId && ids.has(notification.reporterId))
        : [];
    },
    [notifications],
  );

  const unreadCountForReporter = useCallback(
    (reporterIds?: string | string[]) => getForReporter(reporterIds).filter((notification) => !notification.isRead).length,
    [getForReporter],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      isLoading,
      getForAudience,
      unreadCount,
      getForReporter,
      unreadCountForReporter,
      addNotification,
      markRead,
      markAllRead,
    }),
    [
      notifications,
      isLoading,
      getForAudience,
      unreadCount,
      getForReporter,
      unreadCountForReporter,
      addNotification,
      markRead,
      markAllRead,
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
