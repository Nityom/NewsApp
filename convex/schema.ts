import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  articles: defineTable({ id: v.string(), reporterId: v.string(), data: v.any() })
    .index('by_external_id', ['id'])
    .index('by_reporter', ['reporterId']),
  reporters: defineTable({ id: v.string(), email: v.string(), data: v.any() })
    .index('by_external_id', ['id'])
    .index('by_email', ['email']),
  payments: defineTable({ id: v.string(), reporterId: v.string(), data: v.any() })
    .index('by_external_id', ['id'])
    .index('by_reporter', ['reporterId']),
  notifications: defineTable({
    id: v.string(),
    audience: v.union(v.literal('admin'), v.literal('reporter')),
    reporterId: v.optional(v.string()),
    data: v.any(),
  })
    .index('by_external_id', ['id'])
    .index('by_audience', ['audience'])
    .index('by_reporter', ['reporterId']),
  pushTokens: defineTable({
    key: v.string(),
    token: v.string(),
    audience: v.union(v.literal('admin'), v.literal('reporter')),
    reporterIds: v.array(v.string()),
    platform: v.string(),
    updatedAt: v.string(),
  })
    .index('by_key', ['key'])
    .index('by_audience', ['audience'])
    .index('by_token', ['token']),
  settings: defineTable({ key: v.string(), data: v.any() }).index('by_key', ['key']),
});