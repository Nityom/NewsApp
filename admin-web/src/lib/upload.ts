const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? 'dmjetilgd';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? 'ih6tkxko';

export function isLocalOrBase64Image(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('file:');
}

export async function uploadImage(
  file: File | Blob | string,
  folder = 'education-news/publications'
): Promise<string> {
  // If it is already hosted in the cloud (not local/base64/blob), return as is
  if (typeof file === 'string') {
    if (file.startsWith('https://res.cloudinary.com/') || (file.startsWith('http') && !file.startsWith('http://localhost') && !file.startsWith('blob:'))) {
      return file;
    }
    // If it's a blob: URI in browser, convert to Blob object
    if (file.startsWith('blob:')) {
      try {
        const res = await fetch(file);
        file = await res.blob();
      } catch (err) {
        console.warn('Could not fetch blob URL for upload, passing raw:', err);
      }
    }
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET);
  body.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = (result as { error?: { message?: string } })?.error?.message || response.statusText || 'Image upload failed';
    console.error('Cloudinary upload error:', result);
    throw new Error(`Image upload failed: ${errorMsg}`);
  }
  if (!result.secure_url) throw new Error('Cloudinary did not return an image URL.');
  return result.secure_url;
}
