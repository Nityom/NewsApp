'use node';

import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalAction } from './_generated/server';
import { requireAdmin } from './authUtils';
import { cleanData } from './helpers';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const NOTIFICATION_CHANNEL = 'news-alerts-v4';
const NOTIFICATION_SOUND = 'news_alert.wav';

export const deliver = internalAction({
  args: { notificationId: v.string() },
  handler: async (ctx, { notificationId }): Promise<number> => {
    const { notification, registrations } = await ctx.runMutation(internal.notifications.getDeliveryData, { notificationId });
    if (registrations.length === 0) {
      await ctx.runMutation(internal.notifications.recordDelivery, {
        notificationId,
        status: 'failed',
        error: `No ${notification.audience} device is registered for push notifications.`,
        invalidTokens: [],
      });
      return 0;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(registrations.map((registration: { token: string }) => ({
        to: registration.token,
        sound: NOTIFICATION_SOUND,
        title: notification.title,
        body: notification.message,
        priority: 'high',
        channelId: NOTIFICATION_CHANNEL,
        data: cleanData({
          notificationId,
          audience: notification.audience,
          type: notification.type ?? 'system',
          articleId: notification.articleId,
          reporterId: notification.reporterId,
        }),
      }))),
    });
    if (!response.ok) throw new Error(`Expo Push Service returned HTTP ${response.status}`);

    const result = await response.json();
    const tickets = (Array.isArray(result.data) ? result.data : [result.data]) as {
      status?: string;
      message?: string;
      details?: { error?: string };
    }[];
    const invalidTokens = tickets.flatMap((ticket, index) =>
      ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
        ? [registrations[index].token]
        : [],
    );
    const failure = tickets.find((ticket) => ticket?.status === 'error' && ticket.details?.error !== 'DeviceNotRegistered');
    await ctx.runMutation(internal.notifications.recordDelivery, {
      notificationId,
      status: failure ? 'failed' : 'accepted',
      recipientCount: registrations.length,
      ...(failure ? { error: failure.message ?? failure.details?.error ?? 'Expo rejected the notification.' } : {}),
      invalidTokens,
    });
    if (failure) throw new Error(failure.message ?? 'Expo rejected the notification.');
    return registrations.length;
  },
});

export const testAdmin = action({
  args: {},
  handler: async (ctx): Promise<number> => {
    await requireAdmin(ctx);
    const notificationId = `ntf-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    await ctx.runMutation(internal.notifications.insertForAction, {
      notification: {
        id: notificationId,
        type: 'system',
        audience: 'admin',
        title: 'Notification Test',
        message: 'The admin notification panel and push delivery test completed.',
        createdAt: new Date().toISOString(),
        isRead: false,
        pushStatus: 'pending',
      },
    });
    return ctx.runAction(internal.notificationActions.deliver, { notificationId });
  },
});