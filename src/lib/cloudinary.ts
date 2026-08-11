import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Fill these in from your Cloudinary account (Dashboard > Cloud name, and an *unsigned* upload preset
// created under Settings > Upload > Upload presets, with "Signing Mode" set to "Unsigned").
const CLOUDINARY_CLOUD_NAME = 'dmjetilgd';
const CLOUDINARY_UPLOAD_PRESET = 'ih6tkxko';

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const MAX_SAFE_UPLOAD_BYTES = 9 * 1024 * 1024;
const COMPRESSION_PRESETS = [
  { maxEdge: 2048, quality: 0.86 },
  { maxEdge: 1800, quality: 0.8 },
  { maxEdge: 1600, quality: 0.74 },
  { maxEdge: 1400, quality: 0.68 },
];

async function fitImageForUpload(localUri: string) {
  const originalInfo = await FileSystem.getInfoAsync(localUri);
  if (!originalInfo.exists || !originalInfo.size || originalInfo.size <= MAX_SAFE_UPLOAD_BYTES) return localUri;

  const source = await ImageManipulator.manipulate(localUri).renderAsync();
  for (const preset of COMPRESSION_PRESETS) {
    const context = ImageManipulator.manipulate(source);
    const longestEdge = Math.max(source.width, source.height);
    if (longestEdge > preset.maxEdge) {
      context.resize(
        source.width >= source.height
          ? { width: preset.maxEdge }
          : { height: preset.maxEdge },
      );
    }
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ compress: preset.quality, format: SaveFormat.JPEG });
    const resultInfo = await FileSystem.getInfoAsync(result.uri);
    if (resultInfo.exists && resultInfo.size && resultInfo.size <= MAX_SAFE_UPLOAD_BYTES) return result.uri;
  }

  throw new Error('The image is still too large after compression. Please choose a smaller photo.');
}

/**
 * Uploads a local file:// image to Cloudinary (unsigned upload) and returns its HTTPS URL.
 * Remote URLs (already-uploaded images, seeded mock avatars, etc.) pass through unchanged.
 *
 * Uses expo-file-system's native multipart upload instead of fetch+FormData - React Native's
 * JS FormData/fetch path throws "Unsupported FormatDataPart implementation" on some Android
 * builds when appending file-shaped parts, so this avoids that native bridge bug entirely.
 */
export async function uploadLocalFile(localUri: string, folder: string): Promise<string> {
  if (!localUri || !localUri.startsWith('file://')) return localUri;
  const uploadUri = await fitImageForUpload(localUri);

  const response = await FileSystem.uploadAsync(CLOUDINARY_UPLOAD_URL, uploadUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'image/jpeg',
    parameters: {
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      folder,
    },
  });

  let data: { secure_url?: string; error?: { message?: string } };
  try {
    data = JSON.parse(response.body);
  } catch {
    throw new Error(`Image upload failed (status ${response.status}).`);
  }
  if (response.status < 200 || response.status >= 300 || !data.secure_url) {
    throw new Error(data.error?.message ?? `Image upload failed (status ${response.status}).`);
  }
  return data.secure_url;
}

/** Uploads every local file:// URI in the array, in order, keeping remote URLs unchanged. */
export async function uploadLocalFiles(uris: string[], folder: string): Promise<string[]> {
  return Promise.all(uris.map((uri) => uploadLocalFile(uri, folder)));
}
