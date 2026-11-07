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
 * Individual failures are caught and logged so one bad image never aborts the sync.
 */
export async function uploadPublicationImages(
  pub: Publication,
  onProgress?: (status: string) => void
): Promise<{ publication: Publication; uploadedCount: number }> {
  const clone: Publication = JSON.parse(JSON.stringify(pub));
  let uploadedCount = 0;

  // 1. Master Header images
  if (isLocalOrBase64Image(clone.masterHeader.centerLogoUrl)) {
    try {
      onProgress?.(`Uploading emblem/logo for "${clone.title}"...`);
      const url = await uploadImage(
        clone.masterHeader.centerLogoUrl!,
        'education-news/publications/logos'
      );
      if (url && url !== clone.masterHeader.centerLogoUrl) {
        clone.masterHeader.centerLogoUrl = url;
        uploadedCount++;
      }
    } catch (err) {
      console.warn('Failed to upload logo to Cloudinary:', err);
    }
  }

  if (isLocalOrBase64Image(clone.masterHeader.headerImageUrl)) {
    try {
      onProgress?.(`Uploading header banner for "${clone.title}"...`);
      const url = await uploadImage(
        clone.masterHeader.headerImageUrl!,
        'education-news/publications/headers'
      );
      if (url && url !== clone.masterHeader.headerImageUrl) {
        clone.masterHeader.headerImageUrl = url;
        uploadedCount++;
      }
    } catch (err) {
      console.warn('Failed to upload header banner to Cloudinary:', err);
    }
  }

  // 2. Each Page images
  for (let pageIdx = 0; pageIdx < clone.pages.length; pageIdx++) {
    const page = clone.pages[pageIdx];

    // Feature image
    if (isLocalOrBase64Image(page.featureImageUrl)) {
      try {
        onProgress?.(`Uploading Page ${pageIdx + 1} photo for "${clone.title}"...`);
        const url = await uploadImage(
          page.featureImageUrl!,
          'education-news/publications/features'
        );
        if (url && url !== page.featureImageUrl) {
          page.featureImageUrl = url;
          uploadedCount++;
        }
      } catch (err) {
        console.warn(`Failed to upload Page ${pageIdx + 1} feature image to Cloudinary:`, err);
      }
    }

    // Ad banner image
    if (isLocalOrBase64Image(page.ad?.imageUrl)) {
      try {
        onProgress?.(`Uploading Page ${pageIdx + 1} ad banner for "${clone.title}"...`);
        const url = await uploadImage(
          page.ad.imageUrl!,
          'education-news/publications/ads'
        );
        if (url && url !== page.ad.imageUrl) {
          page.ad.imageUrl = url;
          uploadedCount++;
        }
      } catch (err) {
        console.warn(`Failed to upload Page ${pageIdx + 1} ad banner to Cloudinary:`, err);
      }
    }

    // Canvas freeform ad/element images
    if (page.canvasElements && page.canvasElements.length > 0) {
      for (let elemIdx = 0; elemIdx < page.canvasElements.length; elemIdx++) {
        const elem = page.canvasElements[elemIdx];
        if (isLocalOrBase64Image(elem.imageUrl)) {
          try {
            onProgress?.(`Uploading Page ${pageIdx + 1} canvas element for "${clone.title}"...`);
            const url = await uploadImage(
              elem.imageUrl!,
              'education-news/publications/canvas'
            );
            if (url && url !== elem.imageUrl) {
              elem.imageUrl = url;
              uploadedCount++;
            }
          } catch (err) {
            console.warn(`Failed to upload Page ${pageIdx + 1} canvas element to Cloudinary:`, err);
          }
        }
      }
    }
  }

  return { publication: clone, uploadedCount };
}

/**
 * Sanitizes a publication before sending to Convex to ensure the payload stays under Convex's 1MB limit.
 */
function sanitizeForConvex(pub: Publication): Publication {
  const jsonStr = JSON.stringify(pub);
  if (jsonStr.length < 800000) {
    return pub;
  }
  const clone: Publication = JSON.parse(jsonStr);
  for (const page of clone.pages) {
    if (page.featureImageUrl?.startsWith('data:image/') && page.featureImageUrl.length > 150000) {
      page.featureImageUrl = '';
    }
    if (page.ad?.imageUrl?.startsWith('data:image/') && page.ad.imageUrl.length > 150000) {
      page.ad.imageUrl = '';
    }
    if (page.canvasElements) {
      for (const elem of page.canvasElements) {
        if (elem.imageUrl?.startsWith('data:image/') && elem.imageUrl.length > 150000) {
          elem.imageUrl = '';
        }
      }
    }
  }
  return clone;
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
    const convexPayload = sanitizeForConvex(resolvedPub);
    await convex.mutation(api.publications.upsert, { publication: convexPayload });
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
        const convexPayload = sanitizeForConvex(cleanPub);
        await convex.mutation(api.publications.upsert, { publication: convexPayload });
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
