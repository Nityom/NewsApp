import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    setDoc,
    updateDoc,
    writeBatch,
} from '@react-native-firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { db, stripUndefined } from '@/lib/firebase';
import { mockNotifications } from '@/mocks/data';
import type { AppNotification } from '@/types/models';

const COLLECTION = 'notifications';

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
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        setNotifications(snapshot.docs.map((d) => d.data() as AppNotification));
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
          mockNotifications.forEach((n) => batch.set(doc(db, COLLECTION, n.id), n));
          await batch.commit();
        }
      } catch {
        // best-effort - the app still works from whatever the live listener has
      }
    })();
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
