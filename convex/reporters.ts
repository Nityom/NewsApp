import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getAuthEmail, getReporterForEmail, isAdminEmail, requireAdmin } from './authUtils';
import { cleanData, findByExternalId } from './helpers';

const PROTECTED_FIELDS = ['email', 'requestStatus', 'joinFeeAmount', 'isActive', 'isVerified', 'totalEarnings'];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const email = await getAuthEmail(ctx);
    if (isAdminEmail(email)) return (await ctx.db.query('reporters').collect()).map((document) => document.data);
    const reporter = await getReporterForEmail(ctx.db, email);
    return reporter ? [reporter.data] : [];
  },
});

export const getByExternalId = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const email = await getAuthEmail(ctx);
    const reporter = await findByExternalId(ctx.db, 'reporters', id);
    if (!reporter) return null;
    if (!isAdminEmail(email) && reporter.email !== email) throw new Error('You can only view your own reporter record.');
    return reporter.data;
  },
});

export const upsert = mutation({
  args: { reporter: v.any() },
  handler: async (ctx, { reporter }) => {
    const email = await getAuthEmail(ctx);
    const data = cleanData(reporter);
    if (!isAdminEmail(email) && String(data.email).toLowerCase() !== email) throw new Error('You can only create your own reporter record.');
    const existing = await findByExternalId(ctx.db, 'reporters', data.id);
    if (existing && !isAdminEmail(email)) throw new Error('Use profile update for an existing reporter.');
    if (!isAdminEmail(email)) {
      data.requestStatus = 'pending';
      data.isActive = false;
      data.isVerified = false;
      data.totalEarnings = 0;
      delete data.joinFeeAmount;
    }
    const record = { id: data.id, email: String(data.email).toLowerCase(), data };
    if (existing) await ctx.db.patch(existing._id, record);
    else await ctx.db.insert('reporters', record);
  },
});

export const patch = mutation({
  args: { id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const email = await getAuthEmail(ctx);
    const existing = await findByExternalId(ctx.db, 'reporters', args.id);
    if (!existing) throw new Error('Reporter not found.');
    if (!isAdminEmail(email)) {
      if (existing.email !== email) throw new Error('You can only update your own profile.');
      if (PROTECTED_FIELDS.some((field) => args.patch[field] !== undefined)) throw new Error('Only an administrator can change account status or payment fields.');
    }
    const data = cleanData({ ...existing.data, ...args.patch });
    await ctx.db.patch(existing._id, { email: String(data.email).toLowerCase(), data });

    if (args.patch.name !== undefined || args.patch.avatar !== undefined || args.patch.photo !== undefined) {
      const payments = await ctx.db
        .query('payments')
        .withIndex('by_reporter', (query) => query.eq('reporterId', existing.id))
        .collect();
      const reporterAvatar = String(data.avatar ?? data.photo ?? '');
      await Promise.all(payments.map((payment) => ctx.db.patch(payment._id, {
        data: {
          ...payment.data,
          reporterName: String(data.name),
          reporterAvatar,
        },
      })));
    }
    return args.patch;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await findByExternalId(ctx.db, 'reporters', id);
    if (existing) await ctx.db.delete(existing._id);
  },
});