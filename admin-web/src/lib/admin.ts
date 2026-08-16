import type { Article } from '../types';

export const ADMIN_NAME = 'Madhav Bhalerao';
export const ADMIN_PHONE = '985054111';

export function articleByline(article: Article) {
  if (article.reporterId === 'admin') {
    return { name: ADMIN_NAME, phone: ADMIN_PHONE };
  }
  return { name: article.reporterName, phone: article.reporterPhone };
}
