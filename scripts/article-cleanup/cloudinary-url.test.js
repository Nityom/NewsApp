'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { articleCloudinaryPublicIds, cloudinaryPublicIdFromUrl } = require('./cloudinary-url');

test('extracts a nested Cloudinary public ID', () => {
  assert.equal(
    cloudinaryPublicIdFromUrl(
      'https://res.cloudinary.com/dmjetilgd/image/upload/v1786280000/articles/art-123/images/photo.jpg',
      'dmjetilgd',
    ),
    'articles/art-123/images/photo',
  );
});

test('ignores non-Cloudinary and other-cloud URLs', () => {
  assert.equal(cloudinaryPublicIdFromUrl('https://example.com/photo.jpg', 'dmjetilgd'), null);
  assert.equal(
    cloudinaryPublicIdFromUrl('https://res.cloudinary.com/another/image/upload/v1/photo.jpg', 'dmjetilgd'),
    null,
  );
});

test('collects and deduplicates every article image field', () => {
  const banner = 'https://res.cloudinary.com/dmjetilgd/image/upload/v1/articles/art-1/banner.jpg';
  const gallery = 'https://res.cloudinary.com/dmjetilgd/image/upload/v1/articles/art-1/gallery.jpg';
  assert.deepEqual(
    articleCloudinaryPublicIds(
      {
        banner,
        images: [gallery, gallery],
        advertisements: ['https://example.com/external.jpg'],
        sections: [{ image: banner }, { content: 'No image' }],
      },
      'dmjetilgd',
    ),
    ['articles/art-1/banner', 'articles/art-1/gallery'],
  );
});
