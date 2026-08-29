import type { DefaultFunctionArgs, FunctionReference } from 'convex/server';

import type { AppNotification, Article, Payment, PublicationInfo, Reporter } from '../types';

type Query<Args extends DefaultFunctionArgs, Result> = FunctionReference<'query', 'public', Args, Result>;
type Mutation<Args extends DefaultFunctionArgs, Result = void> = FunctionReference<'mutation', 'public', Args, Result>;

const query = <Args extends DefaultFunctionArgs, Result>(name: string) => name as unknown as Query<Args, Result>;
const mutation = <Args extends DefaultFunctionArgs, Result = void>(name: string) => name as unknown as Mutation<Args, Result>;

export const api = {
  articles: {
    list: query<Record<string, never>, Article[]>('articles:list'),
    upsert: mutation<{ article: Article }>('articles:upsert'),
    patch: mutation<{ id: string; patch: Partial<Article> }>('articles:patch'),
    remove: mutation<{ id: string }>('articles:remove'),
  },
  reporters: {
    list: query<Record<string, never>, Reporter[]>('reporters:list'),
    getPublicCard: query<{ id: string }, Reporter | null>('reporters:getPublicCard'),
    patch: mutation<{ id: string; patch: Partial<Reporter> }, Partial<Reporter>>('reporters:patch'),
    remove: mutation<{ id: string }>('reporters:remove'),
  },
  payments: {
    list: query<Record<string, never>, Payment[]>('payments:list'),
    updateStatus: mutation<{ id: string; status: Payment['status'] }>('payments:updateStatus'),
    updateJoiningFeeStatus: mutation<{ payment: Payment; status: 'paid' | 'failed' }>('payments:updateJoiningFeeStatus'),
  },
  notifications: {
    list: query<Record<string, never>, AppNotification[]>('notifications:list'),
    add: mutation<{ notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> }>('notifications:add'),
    markRead: mutation<{ id: string }>('notifications:markRead'),
    markAllRead: mutation<{ ids: string[] }>('notifications:markAllRead'),
  },
  settings: {
    getPublicationInfo: query<Record<string, never>, PublicationInfo | null>('settings:getPublicationInfo'),
    updatePublicationInfo: mutation<{ info: PublicationInfo }>('settings:updatePublicationInfo'),
  },
};
