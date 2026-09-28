import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation, internalQuery } from './_generated/server';
import { cleanData, findByExternalId } from './helpers';

export const getReporterForOrder = internalQuery({
  args: { reporterId: v.string() },
  handler: async (ctx, { reporterId }) => (await findByExternalId(ctx.db, 'reporters', reporterId))?.data ?? null,
});

export const getPaymentOwner = internalQuery({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const payment = await findByExternalId(ctx.db, 'payments', orderId);
    if (!payment) return null;
    const reporter = await findByExternalId(ctx.db, 'reporters', payment.reporterId);
    return { payment: payment.data, reporterEmail: reporter?.data.email ?? null };
  },
});

export const recordOrder = internalMutation({
  args: { payment: v.any() },
  handler: async (ctx, { payment }) => {
    const data = cleanData(payment);
    const existing = await findByExternalId(ctx.db, 'payments', data.id);
    const record = { id: data.id, reporterId: data.reporterId, data };
    if (existing) await ctx.db.patch(existing._id, record);
    else await ctx.db.insert('payments', record);
  },
});

export const approvePaidOrder = internalMutation({
  args: {
    orderId: v.string(),
    orderAmount: v.number(),
    orderCurrency: v.string(),
    transactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await findByExternalId(ctx.db, 'payments', args.orderId);
    if (!payment) throw new Error('Payment record not found.');
    if (payment.data.status === 'paid') return;
    if (Math.abs(payment.data.amount - args.orderAmount) > 0.01 || args.orderCurrency !== 'INR') {
      throw new Error('The confirmed Razorpay amount does not match the payment request.');
    }

    const reporter = await findByExternalId(ctx.db, 'reporters', payment.reporterId);
    if (!reporter) throw new Error('Reporter record not found.');
    const updatedAt = new Date().toISOString();
    const validUntilDate = new Date();
    validUntilDate.setFullYear(validUntilDate.getFullYear() + 1);
    const validUntil = validUntilDate.toISOString();

    await ctx.db.patch(payment._id, {
      data: {
        ...payment.data,
        status: 'paid',
        transactionId: args.transactionId || payment.data.transactionId,
        updatedAt,
      },
    });

    if (payment.data.purpose === 'joining_fee' || !reporter.data.isActive) {
      await ctx.db.patch(reporter._id, {
        data: {
          ...reporter.data,
          requestStatus: 'approved',
          isActive: true,
          isVerified: true,
          validUntil,
        },
      });
    }

    const isJoining = payment.data.purpose === 'joining_fee';
    const notificationId = `payment-${args.orderId}`;
    const existingNotification = await findByExternalId(ctx.db, 'notifications', notificationId);
    if (!existingNotification) {
      const notification = {
        id: notificationId,
        type: 'payment',
        audience: 'reporter',
        title: 'Payment Confirmed',
        message: isJoining
          ? `Your payment of ₹${args.orderAmount.toLocaleString('en-IN')} is confirmed. Your reporter account and 1-year press credential are now active.`
          : `Your payment of ₹${args.orderAmount.toLocaleString('en-IN')} to the admin has been confirmed via Razorpay.`,
        reporterId: payment.reporterId,
        createdAt: updatedAt,
        isRead: false,
        pushStatus: 'pending',
      };
      await ctx.db.insert('notifications', {
        id: notificationId,
        audience: 'reporter',
        reporterId: payment.reporterId,
        data: notification,
      });
      await ctx.scheduler.runAfter(0, internal.notificationActions.deliver, { notificationId });
    }

    const adminNotificationId = `admin-alert-${args.orderId}`;
    const existingAdminNotification = await findByExternalId(ctx.db, 'notifications', adminNotificationId);
    if (!existingAdminNotification) {
      await ctx.db.insert('notifications', {
        id: adminNotificationId,
        audience: 'admin',
        reporterId: payment.reporterId,
        data: {
          id: adminNotificationId,
          type: 'payment',
          audience: 'admin',
          title: 'Payment Received',
          message: `${reporter.data.name} paid ₹${args.orderAmount.toLocaleString('en-IN')} via Razorpay.`,
          reporterId: payment.reporterId,
          createdAt: updatedAt,
          isRead: false,
          pushStatus: 'pending',
        },
      });
    }
  },
});
