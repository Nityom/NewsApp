import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireAdmin } from './authUtils';
import { cleanData } from './helpers';

const PUBLICATION_INFO_KEY = 'publicationInfo';

export const getPublicationInfo = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query('settings')
    .withIndex('by_key', (query) => query.eq('key', PUBLICATION_INFO_KEY)).unique())?.data ?? null,
});

export const updatePublicationInfo = mutation({
  args: { info: v.any() },
  handler: async (ctx, { info }) => {
    await requireAdmin(ctx);
    const data = cleanData(info);
    const existing = await ctx.db.query('settings')
      .withIndex('by_key', (query) => query.eq('key', PUBLICATION_INFO_KEY)).unique();
    if (existing) await ctx.db.patch(existing._id, { data });
    else await ctx.db.insert('settings', { key: PUBLICATION_INFO_KEY, data });
  },
});