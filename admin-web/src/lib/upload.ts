const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? 'dmjetilgd';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? 'ih6tkxko';

export function isLocalOrBase64Image(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('file:') ||
    (url.startsWith('/') && !url.startsWith('//')) ||
    url.startsWith('http://localhost') ||
    url.startsWith('http://127.0.0.1')
  );
}

export async function uploadImage(
  file: File | Blob | string,
  folder = 'education-news/publications'
): Promise<string> {
  // If it is already hosted on Cloudinary or external HTTPS CDN (not localhost/blob/relative), return as is
  if (typeof file === 'string') {
    if (file.startsWith('https://res.cloudinary.com/')) {
      return file;
    }
    if (
      file.startsWith('http') &&
      !file.startsWith('http://localhost') &&
      !file.startsWith('http://127.0.0.1')
    ) {
      return file;
    }

    // Convert local relative asset (/logoBanner.jpeg) or blob: URL into an actual Blob in the browser
    if (
      file.startsWith('/') ||
      file.startsWith('blob:') ||
      file.startsWith('http://localhost') ||
      file.startsWith('http://127.0.0.1')
    ) {
      try {
        const res = await fetch(file);
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 0) {
            file = blob;
          }
        }
      } catch (err) {
        console.warn('Could not fetch local/blob URL as Blob object:', err);
      }
    }

    // If still an unresolved local relative path, return as is to avoid 400 Unsupported source URL
    if (typeof file === 'string' && file.startsWith('/')) {
      return file;
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
    const errorMsg =
      (result as { error?: { message?: string } })?.error?.message ||
      response.statusText ||
      'Image upload failed';
    console.error('Cloudinary upload error:', result);
    throw new Error(`Image upload failed: ${errorMsg}`);
  }
  if (!result.secure_url) throw new Error('Cloudinary did not return an image URL.');
  return result.secure_url;
}
