import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createExpoPushMessages,
  filterNotificationsForAudience,
  filterNotificationsForReporter,
  selectPushTokens,
} from './notificationPush.ts';

const registrations = [
  { token: 'admin-a', audience: 'admin' as const },
  { token: 'admin-a', audience: 'admin' as const },
  { token: 'admin-b', audience: 'admin' as const },
  { token: 'reporter-a', audience: 'reporter' as const, reporterIds: ['user-a', 'rep-a'] },
  { token: 'reporter-b', audience: 'reporter' as const, reporterIds: ['user-b', 'rep-b'] },
];

const eventMatrix = [
  { type: 'reporter_joined', audience: 'admin' as const, reporterId: 'rep-a' },
  { type: 'article_pending', audience: 'admin' as const, articleId: 'article-a' },
  { type: 'payment', audience: 'admin' as const, reporterId: 'rep-a' },
  { type: 'article_approved', audience: 'reporter' as const, reporterId: 'rep-a', articleId: 'article-a' },
  { type: 'article_rejected', audience: 'reporter' as const, reporterId: 'rep-a', articleId: 'article-a' },
  { type: 'payment', audience: 'reporter' as const, reporterId: 'rep-a' },
  { type: 'system', audience: 'reporter' as const, reporterId: 'rep-a' },
];

test('selects and deduplicates recipients for every notification event', () => {
  for (const event of eventMatrix) {
    const notification = { id: `id-${event.type}`, title: 'Title', message: 'Message', ...event };
    const tokens = selectPushTokens(notification, registrations);
    assert.deepEqual(
      tokens,
      event.audience === 'admin' ? ['admin-a', 'admin-b'] : ['reporter-a'],
      `${event.type} selected the wrong recipients`,
    );
  }
});

test('does not send reporter alerts without a matching reporter registration', () => {
  const tokens = selectPushTokens({
    id: 'missing',
    type: 'system',
    title: 'Title',
    message: 'Message',
    audience: 'reporter',
    reporterId: 'rep-missing',
  }, registrations);
  assert.deepEqual(tokens, []);
});

test('shows every admin event in the admin panel and only matching events in a reporter panel', () => {
  const notifications = eventMatrix.map((event, index) => ({ id: `notification-${index}`, ...event }));
  assert.deepEqual(
    filterNotificationsForAudience(notifications, 'admin').map((notification) => notification.type),
    ['reporter_joined', 'article_pending', 'payment'],
  );
  assert.deepEqual(
    filterNotificationsForReporter(notifications, ['user-a', 'rep-a']).map((notification) => notification.type),
    ['article_approved', 'article_rejected', 'payment', 'system'],
  );
  assert.deepEqual(filterNotificationsForReporter(notifications, ['rep-b']), []);
});

test('creates Expo payloads with sound, channel, priority, and navigation data', () => {
  const [message] = createExpoPushMessages({
    id: 'notification-a',
    type: 'reporter_joined',
    title: 'New Reporter Request',
    message: 'A reporter joined.',
    audience: 'admin',
    reporterId: 'rep-a',
  }, ['admin-a'], 'news-alerts-v4', 'news_alert.wav');

  assert.deepEqual(message, {
    to: 'admin-a',
    sound: 'news_alert.wav',
    title: 'New Reporter Request',
    body: 'A reporter joined.',
    priority: 'high',
    channelId: 'news-alerts-v4',
    data: {
      notificationId: 'notification-a',
      audience: 'admin',
      type: 'reporter_joined',
      reporterId: 'rep-a',
    },
  });
});