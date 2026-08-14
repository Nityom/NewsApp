/// <reference types="node" />

'use node';

import crypto from 'node:crypto';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

const RETENTION_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function requiredEnvironment(name: 'CLOUDINARY_CLOUD_NAME' | 'CLOUDINARY_API_KEY' | 'CLOUDINARY_API_SECRET') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured in Convex.`);
  return value;
}

function cloudinaryPublicIdFromUrl(value: unknown, cloudName: string) {
  if (typeof value !== 'string' || !value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.hostname !== 'res.cloudinary.com') return null;

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] !== cloudName || segments[1] !== 'image' || segments[2] !== 'upload') return null;
  const versionIndex = segments.findIndex((segment, index) => index >= 3 && /^v\d+$/.test(segment));
  if (versionIndex < 0 || versionIndex === segments.length - 1) return null;
  return decodeURIComponent(segments.slice(versionIndex + 1).join('/')).replace(/\.[^/.]+$/, '') || null;
}

function articlePublicIds(article: any, cloudName: string) {
  const urls = [
    article.banner,
    ...(Array.isArray(article.images) ? article.images : []),
    ...(Array.isArray(article.advertisements) ? article.advertisements : []),
    ...(Array.isArray(article.sections) ? article.sections.map((section: any) => section?.image) : []),
  ];
  return [...new Set(urls.map((url) => cloudinaryPublicIdFromUrl(url, cloudName)).filter(Boolean))] as string[];
}

async function destroyCloudinaryImage(publicId: string) {
  const cloudName = requiredEnvironment('CLOUDINARY_CLOUD_NAME');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${requiredEnvironment('CLOUDINARY_API_SECRET')}`)
    .digest('hex');
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp,
    api_key: requiredEnvironment('CLOUDINARY_API_KEY'),
    signature,
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: 'POST', body });
  const result = await response.json();
  if (!response.ok || !['ok', 'not found'].includes(result.result)) {
    throw new Error(`Cloudinary could not delete ${publicId}: ${result.error?.message ?? result.result ?? response.status}`);
  }
}

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<{ examined: number }> => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
    const articles: any[] = await ctx.runQuery(internal.articleCleanupData.listExpired, { cutoff });
    const cloudName = requiredEnvironment('CLOUDINARY_CLOUD_NAME');

    for (const article of articles) {
      try {
        for (const publicId of articlePublicIds(article, cloudName)) await destroyCloudinaryImage(publicId);
        await ctx.runMutation(internal.articleCleanupData.removeExpired, { articleId: article.id });
      } catch (error) {
        console.error(`Failed to clean up article ${article.id}`, error);
      }
    }
    return { examined: articles.length };
  },
});