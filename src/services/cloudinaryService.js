import axios from 'axios';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uses an unsigned upload preset so the browser can upload directly to
 * Cloudinary without a backend round-trip — important on the slow/patchy
 * connections these shops often have. If Cloudinary is not configured for
 * uploads, the image is still kept locally as a data URL so the app remains
 * usable for the shop owner.
 *
 * @param {File} file
 * @param {'shop-logo'|'products'|'bills'|'customers'} folder
 * @param {(percent: number) => void} [onProgress]
 */
export async function uploadImage(file, folder, onProgress) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return { url: await toDataUrl(file), publicId: null };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  try {
    const { data } = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      formData,
      {
        onUploadProgress: (evt) => {
          if (!onProgress || !evt.total) return;
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      }
    );

    return { url: data.secure_url, publicId: data.public_id };
  } catch (error) {
    const cloudinaryMessage = error?.response?.data?.error?.message;

    if (cloudinaryMessage === 'Upload preset not found' || error?.response?.status === 400) {
      return { url: await toDataUrl(file), publicId: null };
    }

    if (cloudinaryMessage) {
      return { url: await toDataUrl(file), publicId: null };
    }

    return { url: await toDataUrl(file), publicId: null };
  }
}
