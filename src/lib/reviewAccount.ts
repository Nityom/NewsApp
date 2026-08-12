export const GOOGLE_PLAY_REVIEW_EMAIL = 'playreview@educationnews.com';
export const GOOGLE_PLAY_REVIEW_PASSWORD = 'PlayReview@2026';

export function isGooglePlayReviewEmail(email?: string | null) {
  return email?.trim().toLowerCase() === GOOGLE_PLAY_REVIEW_EMAIL;
}