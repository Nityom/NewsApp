import { getAuth } from '@react-native-firebase/auth';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { markNotificationNavigationHandled } from '@/lib/notificationNavigation';
import { useReporters } from '@/context/ReportersContext';
import { api } from '@convex/_generated/api';

const CHANNEL_ID = 'news-alerts-v4';
const NOTIFICATION_SOUND = 'news_alert.wav';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function notificationsAllowed(settings: Notifications.NotificationPermissionsStatus) {
  return (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

async function prepareNotifications() {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Education news alerts',
      description: 'Article, payment, and account updates',
      importance: Notifications.AndroidImportance.MAX,
      sound: NOTIFICATION_SOUND,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D99A00',
      showBadge: true,
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (!notificationsAllowed(permissions)) {
    permissions = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }
  if (!notificationsAllowed(permissions)) return null;

  return true;
}

async function getPushToken() {
  if (!(await prepareNotifications())) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID is missing from the app configuration.');

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

function openNotification(notification: Notifications.Notification) {
  const data = notification.request.content.data ?? {};
  if (data.audience === 'admin') {
    if (typeof data.articleId === 'string') router.push(`/(admin)/article/${data.articleId}`);
    else if (typeof data.reporterId === 'string') router.push(`/(admin)/reporter/${data.reporterId}`);
    else router.push('/(admin)/notifications');
    return;
  }

  if (typeof data.articleId === 'string') router.push(`/(reporter)/article/${data.articleId}`);
  else router.push('/(reporter)/(tabs)/notifications');
}

export function SystemNotifications() {
  const { user } = useAuth();
  const { getReporterByEmail } = useReporters();
  const { notifications, isLoading, markRead } = useNotifications();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const notificationSessionRef = useRef<string | null>(null);
  const knownNotificationIdsRef = useRef(new Set<string>());
  const remotelyReceivedIdsRef = useRef(new Set<string>());
  const fallbackTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const registerToken = useMutation(api.notifications.registerPushToken);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const notificationId = notification.request.content.data?.notificationId;
      if (typeof notificationId !== 'string') return;
      remotelyReceivedIdsRef.current.add(notificationId);
      const fallbackTimer = fallbackTimersRef.current.get(notificationId);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimersRef.current.delete(notificationId);
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const notificationId = response.notification.request.content.data?.notificationId;
      if (typeof notificationId === 'string') markRead(notificationId).catch(() => {});
      markNotificationNavigationHandled();
      openNotification(response.notification);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const notificationId = response.notification.request.content.data?.notificationId;
        if (typeof notificationId === 'string') markRead(notificationId).catch(() => {});
        markNotificationNavigationHandled();
        openNotification(response.notification);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => {});

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [markRead]);

  useEffect(() => {
    if (!user || isLoading) return;
    const session = `${user.role}:${user.id}`;
    if (notificationSessionRef.current !== session) {
      notificationSessionRef.current = session;
      knownNotificationIdsRef.current = new Set(notifications.map((notification) => notification.id));
      return;
    }

    const reporterIds = new Set([user.id, reporter?.id].filter((id): id is string => !!id));
    const newNotifications = notifications.filter((notification) => {
      if (knownNotificationIdsRef.current.has(notification.id)) return false;
      if (notification.audience !== user.role) return false;
      return user.role === 'admin' || (!!notification.reporterId && reporterIds.has(notification.reporterId));
    });
    notifications.forEach((notification) => knownNotificationIdsRef.current.add(notification.id));

    newNotifications.forEach((notification) => {
      if (remotelyReceivedIdsRef.current.has(notification.id)) return;
      const timer = setTimeout(() => {
        fallbackTimersRef.current.delete(notification.id);
        if (remotelyReceivedIdsRef.current.has(notification.id)) return;
        Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            sound: NOTIFICATION_SOUND,
            data: {
              notificationId: notification.id,
              audience: notification.audience,
              type: notification.type,
              ...(notification.articleId ? { articleId: notification.articleId } : {}),
              ...(notification.reporterId ? { reporterId: notification.reporterId } : {}),
            },
          },
          trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
        }).catch((error) => console.warn('Local notification fallback failed:', error));
      }, 3000);
      fallbackTimersRef.current.set(notification.id, timer);
    });
  }, [isLoading, notifications, reporter?.id, user]);

  useEffect(() => () => {
    fallbackTimersRef.current.forEach((timer) => clearTimeout(timer));
    fallbackTimersRef.current.clear();
  }, []);

  useEffect(() => {
    if (!user) return;
    let isActive = true;
    const registerPushToken = async () => {
      const ownerUid = getAuth().currentUser?.uid;
      if (!ownerUid) return;
      try {
        const token = await getPushToken();
        if (!token || !isActive) return;
        await registerToken({
          key: encodeURIComponent(`${ownerUid}:${user.role}:${token}`),
          token,
          audience: user.role,
          reporterIds: user.role === 'reporter' ? [user.id, reporter?.id].filter((id): id is string => !!id) : [],
          platform: Platform.OS,
        });
      } catch (error) {
        console.warn('Push notification registration failed:', error);
      }
    };

    registerPushToken();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') registerPushToken();
    });

    return () => {
      isActive = false;
      appStateSubscription.remove();
    };
  }, [registerToken, reporter?.id, user]);

  return null;
}
