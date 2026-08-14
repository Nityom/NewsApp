import type { GenericDatabaseReader, UserIdentity } from 'convex/server';

import type { DataModel } from './_generated/dataModel';

export const ADMIN_EMAIL = 'admin@educationnews.com';

type AuthContext = {
  auth: { getUserIdentity: () => Promise<UserIdentity | null> };
};

export async function getAuthEmail(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || typeof identity.email !== 'string') throw new Error('Authentication required.');
  return identity.email.toLowerCase();
}

export function isAdminEmail(email: string) {
  return email === ADMIN_EMAIL;
}

export async function requireAdmin(ctx: AuthContext) {
  const email = await getAuthEmail(ctx);
  if (!isAdminEmail(email)) throw new Error('Administrator access required.');
  return email;
}

export async function getReporterForEmail(db: GenericDatabaseReader<DataModel>, email: string) {
  return db.query('reporters').withIndex('by_email', (query) => query.eq('email', email)).unique();
}

export function reporterIdAliases(email: string, reporterId?: string) {
  const slug = email.replace(/[^a-z0-9]+/g, '-');
  return new Set([reporterId, `rep-${slug}`, `reporter-${slug}`].filter((id): id is string => !!id));
}