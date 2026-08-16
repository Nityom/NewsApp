import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getAuthEmail, getReporterForEmail, isAdminEmail } from './authUtils';
import { cleanData, findByExternalId } from './helpers';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const email = await getAuthEmail(ctx);
    const articles = await ctx.db.query('articles').collect();
    if (isAdminEmail(email)) return articles.map((document) => document.data);
    const reporter = await getReporterForEmail(ctx.db, email);
    return articles
      .filter((document) => document.data.status === 'approved' || document.reporterId === reporter?.id)
      .map((document) => document.data);
  },
});

export const upsert = mutation({
  args: { article: v.any() },
  handler: async (ctx, { article }) => {
    const email = await getAuthEmail(ctx);
    const data = cleanData(article);
    const existing = await findByExternalId(ctx.db, 'articles', data.id);
    const reporter = isAdminEmail(email) ? null : await getReporterForEmail(ctx.db, email);
    if (!isAdminEmail(email)) {
      if (!reporter) throw new Error('Reporter record not found.');
      data.reporterId = reporter.id;
      data.reporterName = reporter.data.name;
      data.reporterAvatar = reporter.data.avatar;
      data.reporterPhone = reporter.data.phone;
    }
    if (!isAdminEmail(email) && !['draft', 'pending'].includes(data.status)) throw new Error('Only an administrator can publish an article.');
    if (existing) throw new Error('Article already exists.');
    await ctx.db.insert('articles', { id: data.id, reporterId: data.reporterId, data });
  },
});

export const patch = mutation({
  args: { id: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const email = await getAuthEmail(ctx);
    const existing = await findByExternalId(ctx.db, 'articles', args.id);
    if (!existing) throw new Error('Article not found.');
    if (!isAdminEmail(email)) {
      const reporter = await getReporterForEmail(ctx.db, email);
      if (!reporter || existing.reporterId !== reporter.id) throw new Error('You can only edit your own articles.');
      if (args.patch.reporterId !== undefined || (args.patch.status !== undefined && !['draft', 'pending', 'trashed'].includes(args.patch.status))) {
        throw new Error('Only an administrator can change article ownership or review status.');
      }
    }
    await ctx.db.patch(existing._id, { data: cleanData({ ...existing.data, ...args.patch }) });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const email = await getAuthEmail(ctx);
    const existing = await findByExternalId(ctx.db, 'articles', id);
    if (existing && !isAdminEmail(email)) {
      const reporter = await getReporterForEmail(ctx.db, email);
      if (!reporter || existing.reporterId !== reporter.id) throw new Error('You can only delete your own articles.');
    }
    if (existing) await ctx.db.delete(existing._id);
  },
});