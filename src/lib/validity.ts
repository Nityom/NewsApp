export function getValidityDate(validUntil?: string, joinedAt?: string): Date {
  if (validUntil) {
    const d = new Date(validUntil);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (joinedAt) {
    const d = new Date(joinedAt);
    if (!Number.isNaN(d.getTime())) {
      const copy = new Date(d);
      copy.setFullYear(copy.getFullYear() + 1);
      return copy;
    }
  }
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function formatValidityDate(validUntil?: string, joinedAt?: string): string {
  const date = getValidityDate(validUntil, joinedAt);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function isMembershipExpired(validUntil?: string, joinedAt?: string): boolean {
  if (!validUntil && !joinedAt) return false;
  const validityDate = getValidityDate(validUntil, joinedAt);
  return validityDate.getTime() < Date.now();
}

export function getDaysUntilExpiration(validUntil?: string, joinedAt?: string): number {
  const validityDate = getValidityDate(validUntil, joinedAt);
  const diffMs = validityDate.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

