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
  getForReporter: (reporterId?: string) => AppNotification[];
  unreadCountForReporter: (reporterId?: string) => number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
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
    await updateDoc(doc(db, COLLECTION, id), { isRead: true });
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
    (reporterId?: string) => reporterId
      ? notifications.filter((n) => n.audience === 'reporter' && n.reporterId === reporterId)
      : [],
    [notifications],
  );

  const unreadCountForReporter = useCallback(
    (reporterId?: string) => getForReporter(reporterId).filter((n) => !n.isRead).length,
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
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
