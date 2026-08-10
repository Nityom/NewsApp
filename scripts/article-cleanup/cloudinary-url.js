'use strict';

function cloudinaryPublicIdFromUrl(value, cloudName) {
  if (!value || typeof value !== 'string') return null;

  let url;
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

  const publicId = decodeURIComponent(segments.slice(versionIndex + 1).join('/'));
  return publicId.replace(/\.[^/.]+$/, '') || null;
}

function articleCloudinaryPublicIds(article, cloudName) {
  const urls = [
    article.banner,
    ...(Array.isArray(article.images) ? article.images : []),
    ...(Array.isArray(article.advertisements) ? article.advertisements : []),
    ...(Array.isArray(article.sections) ? article.sections.map((section) => section?.image) : []),
  ];

  return [...new Set(urls.map((url) => cloudinaryPublicIdFromUrl(url, cloudName)).filter(Boolean))];
}

module.exports = { articleCloudinaryPublicIds, cloudinaryPublicIdFromUrl };
