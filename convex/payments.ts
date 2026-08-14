import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getReporterForEmail, isAdminEmail, requireAdmin } from './authUtils';
import { cleanData, findByExternalId } from './helpers';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || typeof identity.email !== 'string') return [];
    const email = identity.email.toLowerCase();
    const payments = await ctx.db.query('payments').collect();
    if (isAdminEmail(email)) return payments.map((document) => document.data);
    const reporter = await getReporterForEmail(ctx.db, email);
    return payments.filter((document) => document.reporterId === reporter?.id).map((document) => document.data);
  },
});

export const upsert = mutation({
  args: { payment: v.any() },
  handler: async (ctx, { payment }) => {
    await requireAdmin(ctx);
    const data = cleanData(payment);
    const existing = await findByExternalId(ctx.db, 'payments', data.id);
    const record = { id: data.id, reporterId: data.reporterId, data };
    if (existing) await ctx.db.patch(existing._id, record);
    else await ctx.db.insert('payments', record);
  },
});

export const updateStatus = mutation({
  args: { id: v.string(), status: v.union(v.literal('paid'), v.literal('pending'), v.literal('failed')) },
  handler: async (ctx, { id, status }) => {
    await requireAdmin(ctx);
    const existing = await findByExternalId(ctx.db, 'payments', id);
    if (!existing) throw new Error('Payment not found.');
    await ctx.db.patch(existing._id, { data: { ...existing.data, status, updatedAt: new Date().toISOString() } });
  },
});

export const updateJoiningFeeStatus = mutation({
  args: { payment: v.any(), status: v.union(v.literal('paid'), v.literal('failed')) },
  handler: async (ctx, { payment, status }) => {
    await requireAdmin(ctx);
    const updatedAt = new Date().toISOString();
    const paymentData = cleanData({ ...payment, status, updatedAt });
    const existingPayment = await findByExternalId(ctx.db, 'payments', payment.id);
    const paymentRecord = { id: payment.id, reporterId: payment.reporterId, data: paymentData };
    if (existingPayment) await ctx.db.patch(existingPayment._id, paymentRecord);
    else await ctx.db.insert('payments', paymentRecord);

    const reporter = await findByExternalId(ctx.db, 'reporters', payment.reporterId);
    if (!reporter) throw new Error('Reporter not found.');
    const reporterData = status === 'paid'
      ? { ...reporter.data, requestStatus: 'approved', isActive: true, isVerified: true }
      : { ...reporter.data, requestStatus: 'awaiting_payment' };
    await ctx.db.patch(reporter._id, { data: reporterData });
  },
});