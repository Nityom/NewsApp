import { v } from 'convex/values';

import { internalMutation, internalQuery } from './_generated/server';
import { findByExternalId } from './helpers';

export const listExpired = internalQuery({
  args: { cutoff: v.string() },
  handler: async (ctx, { cutoff }) => (await ctx.db.query('articles').collect())
    .filter((document) => typeof document.data.createdAt === 'string' && document.data.createdAt <= cutoff)
    .map((document) => document.data),
});

export const removeExpired = internalMutation({
  args: { articleId: v.string() },
  handler: async (ctx, { articleId }) => {
    const article = await findByExternalId(ctx.db, 'articles', articleId);
    if (!article) return;

    const notifications = await ctx.db.query('notifications').collect();
    for (const notification of notifications) {
      if (notification.data.articleId === articleId) await ctx.db.delete(notification._id);
    }
    await ctx.db.delete(article._id);
  },
});