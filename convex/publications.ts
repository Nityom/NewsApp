import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { cleanData, findByExternalId } from './helpers';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const publications = await ctx.db.query('publications').collect();
    return publications.map((doc) => doc.data);
  },
});

export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const pub = await findByExternalId(ctx.db, 'publications', id);
    return pub?.data ?? null;
  },
});

export const upsert = mutation({
  args: { publication: v.any() },
  handler: async (ctx, { publication }) => {
    const data = cleanData(publication);
    if (!data.id) throw new Error('Publication ID is required.');
    const existing = await findByExternalId(ctx.db, 'publications', data.id);
    if (existing) {
      await ctx.db.patch(existing._id, { data });
    } else {
      await ctx.db.insert('publications', { id: data.id, data });
    }
    return data;
  },
});

export const patch = mutation({
  args: { id: v.string(), patch: v.any() },
  handler: async (ctx, { id, patch: patchData }) => {
    const existing = await findByExternalId(ctx.db, 'publications', id);
    if (!existing) throw new Error('Publication not found.');
    const updated = cleanData({ ...existing.data, ...patchData });
    await ctx.db.patch(existing._id, { data: updated });
    return updated;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const existing = await findByExternalId(ctx.db, 'publications', id);
    if (existing) await ctx.db.delete(existing._id);
  },
});
