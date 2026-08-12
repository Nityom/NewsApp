type NotificationTarget = {
  id: string;
  type: string;
  title: string;
  message: string;
  audience: 'admin' | 'reporter';
  articleId?: string;
  reporterId?: string;
};

export type PushTokenRegistration = {
  token?: string;
  audience?: 'admin' | 'reporter';
  reporterIds?: string[];
};

export function filterNotificationsForAudience<T extends { audience: 'admin' | 'reporter' }>(
  notifications: T[],
  audience: 'admin' | 'reporter',
) {
  return notifications.filter((notification) => notification.audience === audience);
}

export function filterNotificationsForReporter<T extends { audience: 'admin' | 'reporter'; reporterId?: string }>(
  notifications: T[],
  reporterIds: string[],
) {
  const ids = new Set(reporterIds);
  return ids.size > 0
    ? notifications.filter((notification) =>
        notification.audience === 'reporter' && !!notification.reporterId && ids.has(notification.reporterId))
    : [];
}

export function selectPushTokens(notification: NotificationTarget, registrations: PushTokenRegistration[]) {
  return Array.from(new Set(
    registrations
      .filter((registration) => registration.audience === notification.audience)
      .filter((registration) =>
        notification.audience === 'admin' ||
        (!!notification.reporterId && registration.reporterIds?.includes(notification.reporterId)))
      .map((registration) => registration.token)
      .filter((token): token is string => typeof token === 'string' && token.length > 0),
  ));
}

export function createExpoPushMessages(
  notification: NotificationTarget,
  tokens: string[],
  channelId: string,
  sound: string,
) {
  return tokens.map((token) => ({
    to: token,
    sound,
    title: notification.title,
    body: notification.message,
    priority: 'high',
    channelId,
    data: {
      notificationId: notification.id,
      audience: notification.audience,
      type: notification.type,
      ...(notification.articleId ? { articleId: notification.articleId } : {}),
      ...(notification.reporterId ? { reporterId: notification.reporterId } : {}),
    },
  }));
}