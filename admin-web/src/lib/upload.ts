const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? 'dmjetilgd';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? 'ih6tkxko';

export async function uploadImage(file: File, folder = 'education-news/advertisements') {
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
