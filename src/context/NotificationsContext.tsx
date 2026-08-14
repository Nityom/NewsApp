import { useAction, useMutation, useQuery } from 'convex/react';
import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';

import {
    filterNotificationsForAudience,
    filterNotificationsForReporter,
} from '@/lib/notificationPush';
import type { AppNotification } from '@/types/models';
import { api } from '@convex/_generated/api';

import { useAuth } from './AuthContext';

const MOCK_NOTIFICATION_IDS = new Set(Array.from({ length: 6 }, (_, index) => `ntf-${index + 1}`));

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
  const { user } = useAuth();
  const result = useQuery(api.notifications.list, user ? {} : 'skip') as AppNotification[] | undefined;
  const visibleNotifications = useMemo(
    () => (result ?? [])
      .filter((notification) => !MOCK_NOTIFICATION_IDS.has(notification.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [result],
  );
  const isLoading = !!user && result === undefined;
  const loadError = null;
  const addNotificationMutation = useMutation(api.notifications.add);
  const markReadMutation = useMutation(api.notifications.markRead);
  const markAllReadMutation = useMutation(api.notifications.markAllRead);
  const testAdminAction = useAction(api.notificationActions.testAdmin);

  const addNotification = useCallback(
    async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
      await addNotificationMutation({ notification });
    },
    [addNotificationMutation],
  );

  const testAdminNotification = useCallback(async () => {
    return testAdminAction({});
  }, [testAdminAction]);

  const markRead = useCallback(async (id: string) => {
    await markReadMutation({ id });
  }, [markReadMutation]);

  const markAllRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await markAllReadMutation({ ids });
  }, [markAllReadMutation]);

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
