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
  if (!response.ok) throw new Error('Image upload failed. Please try again.');
  const result = await response.json() as { secure_url?: string };
  if (!result.secure_url) throw new Error('Cloudinary did not return an image URL.');
  return result.secure_url;
}
