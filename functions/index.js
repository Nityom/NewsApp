const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_BATCH_SIZE = 100;

function chunks(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

exports.sendSystemNotification = onDocumentCreated('notifications/{notificationId}', async (event) => {
  const notification = event.data?.data();
  if (!notification?.audience || !notification.title || !notification.message) return;

  const tokenSnapshot = await db
    .collection('pushTokens')
    .where('audience', '==', notification.audience)
    .get();

  const recipients = tokenSnapshot.docs.filter((tokenDocument) => {
    if (notification.audience !== 'reporter') return true;
    const reporterIds = tokenDocument.get('reporterIds');
    return Boolean(notification.reporterId) && Array.isArray(reporterIds) && reporterIds.includes(notification.reporterId);
  });

  const uniqueRecipients = Array.from(
    new Map(recipients.map((tokenDocument) => [tokenDocument.get('token'), tokenDocument])).values(),
  ).filter((tokenDocument) => typeof tokenDocument.get('token') === 'string');

  for (const batch of chunks(uniqueRecipients, MAX_BATCH_SIZE)) {
    const messages = batch.map((tokenDocument) => ({
      to: tokenDocument.get('token'),
      sound: 'default',
      title: notification.title,
      body: notification.message,
      priority: 'high',
      channelId: 'news-v2',
      data: {
        notificationId: event.params.notificationId,
        audience: notification.audience,
        type: notification.type ?? 'system',
        ...(notification.articleId ? { articleId: notification.articleId } : {}),
        ...(notification.reporterId ? { reporterId: notification.reporterId } : {}),
      },
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!response.ok) throw new Error(`Expo Push Service returned HTTP ${response.status}`);

    const result = await response.json();
    const tickets = Array.isArray(result.data) ? result.data : [result.data];
    await Promise.all(
      tickets.map((ticket, index) => {
        if (ticket?.status === 'error') {
          logger.error('Expo rejected a push notification', ticket);
          if (ticket.details?.error === 'DeviceNotRegistered') return batch[index].ref.delete();
        }
        return Promise.resolve();
      }),
    );
  }

  logger.info('System notification sent', {
    notificationId: event.params.notificationId,
    recipients: uniqueRecipients.length,
  });
});
