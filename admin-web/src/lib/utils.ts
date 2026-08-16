import type { Reporter } from '../types';

export const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatDate(value?: string, includeTime = false) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

export function dateInputValue(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : '';
}

export function publicationDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${Number(day)}/${Number(month)}/${year}`;
}

export function dedupeReporters(reporters: Reporter[]) {
  const byEmail = new Map<string, Reporter>();
  for (const reporter of reporters) {
    const key = reporter.email.toLowerCase();
    const current = byEmail.get(key);
    if (!current || new Date(reporter.joinedAt).getTime() >= new Date(current.joinedAt).getTime()) {
      byEmail.set(key, reporter);
    }
  }
  return [...byEmail.values()];
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.replace(/^.*?Uncaught Error:\s*/, '') : 'Something went wrong.';
}

export function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function articleImageFilename(title: string) {
  const safeTitle = [...title]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127 && !'/\\:*?"<>|'.includes(character);
    })
    .join('')
    .normalize('NFC')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 100)
    .replace(/[.-]+$/g, '');
  return `${safeTitle || 'education-news-article'}.png`;
}
