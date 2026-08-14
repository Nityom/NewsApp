import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';
import { getAuthEmail, getReporterForEmail, isAdminEmail, reporterIdAliases } from './authUtils';
import { cleanData, findByExternalId } from './helpers';

function createNotification(data: any): any {
  return cleanData({
    ...data,
    id: `ntf-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    isRead: false,
    pushStatus: 'pending',
  });
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const email = await getAuthEmail(ctx);
    const notifications = await ctx.db.query('notifications').collect();
    if (isAdminEmail(email)) return notifications.filter((document) => document.audience === 'admin').map((document) => document.data);
    const reporter = await getReporterForEmail(ctx.db, email);
    const allowedIds = reporterIdAliases(email, reporter?.id);
    return notifications
      .filter((document) => document.audience === 'reporter' && !!document.reporterId && allowedIds.has(document.reporterId))
      .map((document) => document.data);
  },
});

export const add = mutation({
  args: { notification: v.any() },
  handler: async (ctx, { notification }) => {
    const email = await getAuthEmail(ctx);
    if (!isAdminEmail(email)) {
      if (notification.audience !== 'admin') throw new Error('Reporters can only notify administrators.');
      const reporter = await getReporterForEmail(ctx.db, email);
      if (!reporter) throw new Error('Reporter record not found.');
      if (notification.type === 'reporter_joined') {
        if (!reporterIdAliases(email, reporter.id).has(notification.reporterId)) throw new Error('Invalid reporter notification.');
      } else if (notification.type === 'article_pending') {
        const article = await findByExternalId(ctx.db, 'articles', notification.articleId);
        if (!article || article.reporterId !== reporter.id) throw new Error('You can only notify administrators about your own article.');
      } else {
        throw new Error('This notification can only be created by an administrator.');
      }
    }
    const data = createNotification(notification);
    await ctx.db.insert('notifications', {
      id: data.id,
      audience: data.audience,
      ...(data.reporterId ? { reporterId: data.reporterId } : {}),
      data,
    });
    await ctx.scheduler.runAfter(0, internal.notificationActions.deliver, { notificationId: data.id });
  },
});

export const requestPaymentAssistance = mutation({
  args: {},
  handler: async (ctx) => {
    const email = await getAuthEmail(ctx);
    if (isAdminEmail(email)) throw new Error('This request is only available to reporters.');
    const reporter = await getReporterForEmail(ctx.db, email);
    if (!reporter) throw new Error('Reporter record not found.');

    const payments = await ctx.db.query('payments')
      .withIndex('by_reporter', (query) => query.eq('reporterId', reporter.id))
      .collect();
    const joiningFeePaid = payments.some((payment) =>
      payment.data.purpose === 'joining_fee' && payment.data.status === 'paid',
    );
    if (joiningFeePaid) throw new Error('Your joining fee is already confirmed.');

    const existingRequests = await ctx.db.query('notifications')
      .withIndex('by_reporter', (query) => query.eq('reporterId', reporter.id))
      .collect();
    const alreadyPending = existingRequests.some((notification) =>
      notification.audience === 'admin'
      && notification.data.requestKind === 'payment_assistance'
      && !notification.data.isRead,
    );
    if (alreadyPending) return { created: false };

    const data = createNotification({
      type: 'payment',
      requestKind: 'payment_assistance',
      audience: 'admin',
      title: 'Payment Assistance Requested',
      message: `${reporter.data.name} has not completed the joining-fee payment and requested admin assistance.`,
      reporterId: reporter.id,
    });
    await ctx.db.insert('notifications', {
      id: data.id,
      audience: 'admin',
      reporterId: reporter.id,
      data,
    });
    await ctx.scheduler.runAfter(0, internal.notificationActions.deliver, { notificationId: data.id });
    return { created: true };
  },
});

export const markRead = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const email = await getAuthEmail(ctx);
    const existing = await findByExternalId(ctx.db, 'notifications', id);
    if (existing && !isAdminEmail(email)) {
      const reporter = await getReporterForEmail(ctx.db, email);
      if (existing.audience !== 'reporter' || !existing.reporterId || !reporterIdAliases(email, reporter?.id).has(existing.reporterId)) {
        throw new Error('You can only mark your own notifications as read.');
      }
    } else if (existing?.audience !== 'admin') {
      throw new Error('You can only mark your own notifications as read.');
    }
    if (existing) await ctx.db.patch(existing._id, { data: { ...existing.data, isRead: true } });
  },
});

export const markAllRead = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const email = await getAuthEmail(ctx);
    const reporter = isAdminEmail(email) ? null : await getReporterForEmail(ctx.db, email);
    const allowedIds = reporterIdAliases(email, reporter?.id);
    for (const id of ids) {
      const existing = await findByExternalId(ctx.db, 'notifications', id);
      const allowed = isAdminEmail(email)
        ? existing?.audience === 'admin'
        : existing?.audience === 'reporter' && !!existing.reporterId && allowedIds.has(existing.reporterId);
      if (existing && !allowed) throw new Error('You can only mark your own notifications as read.');
      if (existing) await ctx.db.patch(existing._id, { data: { ...existing.data, isRead: true } });
    }
  },
});

export const registerPushToken = mutation({
  args: {
    key: v.string(),
    token: v.string(),
    audience: v.union(v.literal('admin'), v.literal('reporter')),
    reporterIds: v.array(v.string()),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || typeof identity.email !== 'string') throw new Error('Authentication required.');
    const email = identity.email.toLowerCase();
    if (isAdminEmail(email)) {
      if (args.audience !== 'admin' || args.reporterIds.length > 0) throw new Error('Invalid administrator push registration.');
    } else {
      const reporter = await getReporterForEmail(ctx.db, email);
      const allowedIds = reporterIdAliases(email, reporter?.id);
      if (args.audience !== 'reporter' || args.reporterIds.some((id) => !allowedIds.has(id))) {
        throw new Error('Invalid reporter push registration.');
      }
    }
    const matches = await ctx.db.query('pushTokens').withIndex('by_token', (query) => query.eq('token', args.token)).collect();
    const existing = matches[0];
    const record = {
      ...args,
      key: encodeURIComponent(`${identity.subject}:${args.audience}:${args.token}`),
      updatedAt: new Date().toISOString(),
    };
    if (existing) await ctx.db.patch(existing._id, record);
    else await ctx.db.insert('pushTokens', record);
    for (const duplicate of matches.slice(1)) await ctx.db.delete(duplicate._id);
  },
});

export const getDeliveryData = internalMutation({
  args: { notificationId: v.string() },
  handler: async (ctx, { notificationId }) => {
    const notification = await findByExternalId(ctx.db, 'notifications', notificationId) as any;
    if (!notification) throw new Error('Notification not found.');
    const registrations = await ctx.db.query('pushTokens')
      .withIndex('by_audience', (query) => query.eq('audience', notification.audience)).collect();
    const tokens = registrations.filter((registration) =>
      notification.audience === 'admin'
      || (!!notification.reporterId && registration.reporterIds.includes(notification.reporterId)),
    );
    return { notification: notification.data, registrations: tokens };
  },
});

export const recordDelivery = internalMutation({
  args: {
    notificationId: v.string(),
    status: v.union(v.literal('accepted'), v.literal('failed')),
    recipientCount: v.optional(v.number()),
    error: v.optional(v.string()),
    invalidTokens: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const notification = await findByExternalId(ctx.db, 'notifications', args.notificationId);
    if (notification) {
      await ctx.db.patch(notification._id, {
        data: cleanData({
          ...notification.data,
          pushStatus: args.status,
          pushRecipientCount: args.recipientCount,
          pushError: args.error,
        }),
      });
    }
    for (const token of args.invalidTokens) {
      const registration = await ctx.db.query('pushTokens').withIndex('by_token', (query) => query.eq('token', token)).unique();
      if (registration) await ctx.db.delete(registration._id);
    }
  },
});

export const insertForAction = internalMutation({
  args: { notification: v.any() },
  handler: async (ctx, { notification }) => {
    await ctx.db.insert('notifications', {
      id: notification.id,
      audience: notification.audience,
      data: notification,
    });
  },
});