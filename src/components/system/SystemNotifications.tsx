import { getAuth } from '@react-native-firebase/auth';
import { deleteDoc, doc, setDoc } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useReporters } from '@/context/ReportersContext';
import { db, stripUndefined } from '@/lib/firebase';

const CHANNEL_ID = 'news-v2';
const TOKENS_COLLECTION = 'pushTokens';

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

async function getPushToken() {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Education news alerts',
      description: 'Article, payment, and account updates',
      importance: Notifications.AndroidImportance.MAX,
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
  const { markRead } = useNotifications();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const notificationId = response.notification.request.content.data?.notificationId;
      if (typeof notificationId === 'string') markRead(notificationId).catch(() => {});
      openNotification(response.notification);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const notificationId = response.notification.request.content.data?.notificationId;
        if (typeof notificationId === 'string') markRead(notificationId).catch(() => {});
        openNotification(response.notification);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => {});

    return () => responseSubscription.remove();
  }, [markRead]);

  useEffect(() => {
    if (!user) return;
    const ownerUid = getAuth().currentUser?.uid;
    if (!ownerUid) return;

    let isActive = true;
    let tokenDocumentId: string | undefined;
    getPushToken()
      .then(async (token) => {
        if (!token || !isActive) return;
        tokenDocumentId = encodeURIComponent(token);
        await setDoc(
          doc(db, TOKENS_COLLECTION, tokenDocumentId),
          stripUndefined({
            token,
            ownerUid,
            audience: user.role,
            reporterIds: user.role === 'reporter' ? [user.id, reporter?.id].filter(Boolean) : [],
            platform: Platform.OS,
            updatedAt: new Date().toISOString(),
          }),
        );
      })
      .catch((error) => console.warn('Push notification registration failed:', error));

    return () => {
      isActive = false;
      if (tokenDocumentId) deleteDoc(doc(db, TOKENS_COLLECTION, tokenDocumentId)).catch(() => {});
    };
  }, [reporter?.id, user]);

  return null;
}
