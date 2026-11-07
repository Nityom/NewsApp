import type { Publication } from '../types/publication';
import { getAllPublications, savePublication } from './publicationsStorage';
import { isLocalOrBase64Image, uploadImage } from './upload';
import { convex } from './convex';
import { api } from './api';

/**
 * Checks if a publication contains any local, blob, or base64 images
 * that need to be uploaded to Cloudinary.
 */
export function publicationHasLocalImages(pub: Publication): boolean {
  if (isLocalOrBase64Image(pub.masterHeader.centerLogoUrl)) return true;
  if (isLocalOrBase64Image(pub.masterHeader.headerImageUrl)) return true;

  for (const page of pub.pages) {
    if (isLocalOrBase64Image(page.featureImageUrl)) return true;
    if (isLocalOrBase64Image(page.ad?.imageUrl)) return true;
    if (page.canvasElements?.some((elem) => isLocalOrBase64Image(elem.imageUrl))) return true;
  }

  return false;
}

/**
 * Recursively scans and uploads all local/base64 images in a publication to Cloudinary,
 * returning a clean copy with permanent HTTPS URLs.
 */
export async function uploadPublicationImages(
  pub: Publication,
  onProgress?: (status: string) => void
): Promise<{ publication: Publication; uploadedCount: number }> {
  const clone: Publication = JSON.parse(JSON.stringify(pub));
  let uploadedCount = 0;

  // 1. Master Header images
  if (isLocalOrBase64Image(clone.masterHeader.centerLogoUrl)) {
    onProgress?.(`Uploading emblem/logo for "${clone.title}"...`);
    clone.masterHeader.centerLogoUrl = await uploadImage(
      clone.masterHeader.centerLogoUrl!,
      'education-news/publications/logos'
    );
    uploadedCount++;
  }

  if (isLocalOrBase64Image(clone.masterHeader.headerImageUrl)) {
    onProgress?.(`Uploading header banner for "${clone.title}"...`);
    clone.masterHeader.headerImageUrl = await uploadImage(
      clone.masterHeader.headerImageUrl!,
      'education-news/publications/headers'
    );
    uploadedCount++;
  }

  // 2. Each Page images
  for (let pageIdx = 0; pageIdx < clone.pages.length; pageIdx++) {
    const page = clone.pages[pageIdx];

    // Feature image
    if (isLocalOrBase64Image(page.featureImageUrl)) {
      onProgress?.(`Uploading Page ${pageIdx + 1} photo for "${clone.title}"...`);
      page.featureImageUrl = await uploadImage(
        page.featureImageUrl!,
        'education-news/publications/features'
      );
      uploadedCount++;
    }

    // Ad banner image
    if (isLocalOrBase64Image(page.ad?.imageUrl)) {
      onProgress?.(`Uploading Page ${pageIdx + 1} ad banner for "${clone.title}"...`);
      page.ad.imageUrl = await uploadImage(
        page.ad.imageUrl!,
        'education-news/publications/ads'
      );
      uploadedCount++;
    }

    // Canvas freeform ad/element images
    if (page.canvasElements && page.canvasElements.length > 0) {
      for (let elemIdx = 0; elemIdx < page.canvasElements.length; elemIdx++) {
        const elem = page.canvasElements[elemIdx];
        if (isLocalOrBase64Image(elem.imageUrl)) {
          onProgress?.(`Uploading Page ${pageIdx + 1} canvas element for "${clone.title}"...`);
          elem.imageUrl = await uploadImage(
            elem.imageUrl!,
            'education-news/publications/canvas'
          );
          uploadedCount++;
        }
      }
    }
  }

  return { publication: clone, uploadedCount };
}

/**
 * Saves a publication to IndexedDB (on device) AND synchronizes it with Convex & Cloudinary.
 * Preserves the on-device copy at all times.
 */
export async function syncPublicationToCloud(
  pub: Publication,
  onProgress?: (status: string) => void
): Promise<Publication> {
  // 1. Immediately save to IndexedDB on device so work is never lost offline
  await savePublication(pub);

  // 2. Upload any local / base64 images to Cloudinary
  const { publication: resolvedPub, uploadedCount } = await uploadPublicationImages(pub, onProgress);

  // 3. If images were converted to cloud URLs, update local IndexedDB record with cloud URLs
  if (uploadedCount > 0) {
    await savePublication(resolvedPub);
  }

  // 4. Upsert to Convex cloud database
  try {
    onProgress?.(`Syncing "${resolvedPub.title}" to Convex cloud...`);
    await convex.mutation(api.publications.upsert, { publication: resolvedPub });
  } catch (err) {
    console.warn('Convex publication upsert offline or failed, local copy preserved:', err);
  }

  return resolvedPub;
}

/**
 * Bidirectionally synchronizes all publications between on-device IndexedDB and Convex.
 * - Uploads all offline publications and their images to Convex & Cloudinary.
 * - Pulls any remote publications from Convex into IndexedDB.
 * - NEVER deletes on-device saved publications.
 */
export async function syncAllPublications(
  onProgress?: (status: string) => void
): Promise<{ publications: Publication[]; syncedCount: number; errors: string[] }> {
  const localList = await getAllPublications();
  const errors: string[] = [];
  let syncedCount = 0;

  let remoteList: Publication[] = [];
  try {
    onProgress?.('Connecting to Convex cloud...');
    remoteList = ((await convex.query(api.publications.list, {})) as Publication[]) || [];
  } catch (err: any) {
    console.warn('Could not reach Convex cloud for publications sync:', err);
    errors.push(`Cloud unreachable: ${err?.message || 'offline'}`);
    return { publications: localList, syncedCount: 0, errors };
  }

  const remoteMap = new Map<string, Publication>(remoteList.map((p) => [p.id, p]));
  const localMap = new Map<string, Publication>(localList.map((p) => [p.id, p]));

  // 1. Sync local publications to Cloudinary & Convex
  for (const localPub of localList) {
    const remotePub = remoteMap.get(localPub.id);
    const hasLocalImages = publicationHasLocalImages(localPub);

    // If not in Convex, or local is newer, or has local base64 images:
    if (!remotePub || localPub.updatedAt >= remotePub.updatedAt || hasLocalImages) {
      try {
        const { publication: cleanPub, uploadedCount } = await uploadPublicationImages(
          localPub,
          onProgress
        );
        // Persist clean cloud URLs into IndexedDB (without deleting local data)
        if (uploadedCount > 0) {
          await savePublication(cleanPub);
          localMap.set(cleanPub.id, cleanPub);
        }

        onProgress?.(`Saving "${cleanPub.title}" to Convex...`);
        await convex.mutation(api.publications.upsert, { publication: cleanPub });
        syncedCount++;
      } catch (err: any) {
        console.error(`Failed to sync publication ${localPub.id}:`, err);
        errors.push(`Failed to sync "${localPub.title}": ${err?.message || err}`);
      }
    }
  }

  // 2. Import any remote publications from Convex into local IndexedDB
  for (const remotePub of remoteList) {
    const localPub = localMap.get(remotePub.id);
    if (!localPub || remotePub.updatedAt > localPub.updatedAt) {
      // Save remote publication to on-device IndexedDB without deleting existing ones!
      await savePublication(remotePub);
      localMap.set(remotePub.id, remotePub);
      syncedCount++;
    }
  }

  // Retrieve final merged publications from on-device storage
  const finalPublications = await getAllPublications();
  return { publications: finalPublications, syncedCount, errors };
}
