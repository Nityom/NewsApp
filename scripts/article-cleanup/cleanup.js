'use strict';

const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { v2: cloudinary } = require('cloudinary');

const { articleCloudinaryPublicIds } = require('./cloudinary-url');

const RETENTION_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function deleteArticleNotifications(db, articleId) {
  const snapshot = await db.collection('notifications').where('articleId', '==', articleId).get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((notification) => batch.delete(notification.ref));
  await batch.commit();
}

async function run() {
  const serviceAccount = JSON.parse(requiredEnvironment('FIREBASE_SERVICE_ACCOUNT'));
  const cloudName = requiredEnvironment('CLOUDINARY_CLOUD_NAME');
  const dryRun = process.argv.includes('--dry-run');

  if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: requiredEnvironment('CLOUDINARY_API_KEY'),
    api_secret: requiredEnvironment('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS).toISOString();
  const snapshot = await db.collection('articles').where('createdAt', '<=', cutoff).get();

  console.log(`${dryRun ? 'Dry run: found' : 'Found'} ${snapshot.size} article(s) created on or before ${cutoff}.`);

  let deleted = 0;
  let failed = 0;
  for (const articleDocument of snapshot.docs) {
    const article = articleDocument.data();
    const publicIds = articleCloudinaryPublicIds(article, cloudName);

    try {
      if (dryRun) {
        console.log(`[dry-run] ${articleDocument.id}: ${publicIds.length} Cloudinary asset(s)`);
        continue;
      }

      for (const publicId of publicIds) {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
        if (result.result !== 'ok' && result.result !== 'not found') {
          throw new Error(`Cloudinary returned "${result.result}" for ${publicId}`);
        }
      }

      await deleteArticleNotifications(db, articleDocument.id);
      await articleDocument.ref.delete();
      deleted += 1;
      console.log(`Deleted ${articleDocument.id} and ${publicIds.length} Cloudinary asset(s).`);
    } catch (error) {
      failed += 1;
      console.error(`Failed to delete ${articleDocument.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`Cleanup complete: ${deleted} deleted, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
