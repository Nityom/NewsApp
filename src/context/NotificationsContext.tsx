import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
} from '@react-native-firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { db, stripUndefined } from '@/lib/firebase';
import {
  createExpoPushMessages,
  filterNotificationsForAudience,
  filterNotificationsForReporter,
  selectPushTokens,
} from '@/lib/notificationPush';
import type { AppNotification } from '@/types/models';

import { useAuth } from './AuthContext';

const COLLECTION = 'notifications';
const TOKENS_COLLECTION = 'pushTokens';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const NOTIFICATION_CHANNEL = 'news-alerts-v4';
const NOTIFICATION_SOUND = 'news_alert.wav';
const MOCK_NOTIFICATION_IDS = new Set(Array.from({ length: 6 }, (_, index) => `ntf-${index + 1}`));

type PushTokenDocument = {
  token?: string;
  audience?: 'admin' | 'reporter';
  reporterIds?: string[];
};

async function sendRemoteNotification(notification: AppNotification) {
  const tokenSnapshot = await getDocs(
    query(collection(db, TOKENS_COLLECTION), where('audience', '==', notification.audience)),
  );
  const registrations = tokenSnapshot.docs.map((tokenDocument) => ({
    ...(tokenDocument.data() as PushTokenDocument),
    audience: notification.audience,
  }));
  const tokens = selectPushTokens(notification, registrations);
  const tokenDocuments = new Map(tokenSnapshot.docs.map((tokenDocument) => [
    (tokenDocument.data() as PushTokenDocument).token,
    tokenDocument,
  ]));

  if (tokens.length === 0) {
    throw new Error(`No ${notification.audience} device is registered for push notifications.`);
  }
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(createExpoPushMessages(
      notification,
      tokens,
      NOTIFICATION_CHANNEL,
      NOTIFICATION_SOUND,
    )),
  });
  if (!response.ok) throw new Error(`Expo Push Service returned HTTP ${response.status}`);

  const result = await response.json();
  const tickets = (Array.isArray(result.data) ? result.data : [result.data]) as {
    status?: string;
    message?: string;
    details?: { error?: string };
  }[];
  const rejectedTickets = tickets.filter((ticket) => ticket?.status === 'error');
  await Promise.all(tickets.map((ticket, index) =>
    ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
      ? tokenDocuments.get(tokens[index])?.ref
        ? deleteDoc(tokenDocuments.get(tokens[index])!.ref)
        : Promise.resolve()
      : Promise.resolve(),
  ));
  const deliveryFailure = rejectedTickets.find((ticket) => ticket.details?.error !== 'DeviceNotRegistered');
  if (deliveryFailure) {
    throw new Error(deliveryFailure.message ?? deliveryFailure.details?.error ?? 'Expo Push Service rejected the notification');
  }
  return tokens.length;
}

function createNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): AppNotification {
  return {
    ...notification,
    id: `ntf-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
    pushStatus: 'pending',
  };
}

function pushErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Remote push delivery failed.';
}

async function recordPushResult(notification: AppNotification) {
  try {
    const recipientCount = await sendRemoteNotification(notification);
    await updateDoc(doc(db, COLLECTION, notification.id), {
      pushStatus: 'accepted',
      pushRecipientCount: recipientCount,
    });
    return recipientCount;
  } catch (error) {
    await updateDoc(doc(db, COLLECTION, notification.id), {
      pushStatus: 'failed',
      pushError: pushErrorMessage(error),
    });
    throw error;
  }
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  isLoading: boolean;
  loadError: string | null;
  getForAudience: (audience: 'reporter' | 'admin') => AppNotification[];
  unreadCount: (audience: 'reporter' | 'admin') => number;
  getForReporter: (reporterIds?: string | string[]) => AppNotification[];
  unreadCountForReporter: (reporterIds?: string | string[]) => number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  testAdminNotification: () => Promise<number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (ids: string[]) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadedSession, setLoadedSession] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { user } = useAuth();
  const session = user ? `${user.role}:${user.id}` : null;

  useEffect(() => {
    if (!user) return;
    const currentSession = `${user.role}:${user.id}`;
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
        setLoadError(null);
        setLoadedSession(currentSession);
        if (mockDocuments.length > 0) {
          Promise.all(mockDocuments.map((notificationDoc) => deleteDoc(notificationDoc.ref))).catch(() => {});
        }
      },
      (error) => {
        console.warn('Notification history listener failed:', error);
        setLoadError('Could not load notification history. Please sign out and sign in again.');
        setLoadedSession(currentSession);
      },
    );
    return unsubscribe;
  }, [user]);

  const visibleNotifications = useMemo(
    () => (loadedSession === session ? notifications : []),
    [loadedSession, notifications, session],
  );
  const isLoading = session !== null && loadedSession !== session;

  const addNotification = useCallback(
    async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
      const next = createNotification(notification);
      await setDoc(doc(db, COLLECTION, next.id), stripUndefined(next));
      recordPushResult(next).catch((error) => console.warn('Remote notification delivery failed:', error));
    },
    [],
  );

  const testAdminNotification = useCallback(async () => {
    const next = createNotification({
      type: 'system',
      audience: 'admin',
      title: 'Notification Test',
      message: 'The admin notification panel and push delivery test completed.',
    });
    await setDoc(doc(db, COLLECTION, next.id), stripUndefined(next));
    return recordPushResult(next);
  }, []);

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
    (audience: 'reporter' | 'admin') => filterNotificationsForAudience(visibleNotifications, audience),
    [visibleNotifications],
  );

  const unreadCount = useCallback(
    (audience: 'reporter' | 'admin') => visibleNotifications.filter((n) => n.audience === audience && !n.isRead).length,
    [visibleNotifications],
  );

  const getForReporter = useCallback(
    (reporterIds?: string | string[]) => {
      const ids = Array.isArray(reporterIds) ? reporterIds : reporterIds ? [reporterIds] : [];
      return filterNotificationsForReporter(visibleNotifications, ids);
    },
    [visibleNotifications],
  );

  const unreadCountForReporter = useCallback(
    (reporterIds?: string | string[]) => getForReporter(reporterIds).filter((notification) => !notification.isRead).length,
    [getForReporter],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications: visibleNotifications,
      isLoading,
      loadError,
      getForAudience,
      unreadCount,
      getForReporter,
      unreadCountForReporter,
      addNotification,
      testAdminNotification,
      markRead,
      markAllRead,
    }),
    [
      visibleNotifications,
      isLoading,
      loadError,
      getForAudience,
      unreadCount,
      getForReporter,
      unreadCountForReporter,
      addNotification,
      testAdminNotification,
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
