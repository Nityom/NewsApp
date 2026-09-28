export function formatValidityDate(validUntil?: string, joinedAt?: string): string {
  let date: Date | null = null;
  if (validUntil) {
    const d = new Date(validUntil);
    if (!Number.isNaN(d.getTime())) date = d;
  }
  if (!date && joinedAt) {
    const d = new Date(joinedAt);
    if (!Number.isNaN(d.getTime())) {
      d.setFullYear(d.getFullYear() + 1);
      date = d;
    }
  }
  if (!date) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    date = d;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
