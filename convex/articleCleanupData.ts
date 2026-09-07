import { v } from 'convex/values';

import { internalMutation, internalQuery } from './_generated/server';
import { findByExternalId } from './helpers';

export const listExpired = internalQuery({
  args: { cutoff: v.string() },
  handler: async (ctx, { cutoff }) => (await ctx.db.query('articles').collect())
    .filter((document) => {
      // Only delete approved (published) articles.
      if (document.data.status !== 'approved') return false;

      // registrationDate is stored as "D/M/YYYY" by publicationDate() in the admin web.
      // reviewedAt and createdAt are ISO strings. Normalise all to ISO before comparing.
      const raw: unknown =
        document.data.registrationDate ??
        document.data.reviewedAt ??
        document.data.createdAt;

      if (typeof raw !== 'string' || !raw) return false;

      // Parse "D/M/YYYY" → ISO; ISO strings are passed through Date directly.
      const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      const publishedAt = dmyMatch
        ? new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}T00:00:00.000Z`)
        : new Date(raw);

      return !Number.isNaN(publishedAt.getTime()) && publishedAt.toISOString() <= cutoff;
    })
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