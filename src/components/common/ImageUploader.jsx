import { useCallback, useRef, useState } from 'react';
import { HiOutlineCloudArrowUp, HiOutlineXCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { uploadImage } from '../../services/cloudinaryService';

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Uploads immediately on selection (not deferred to form-submit) so the
 * person sees success/failure right away instead of finding out only when
 * they hit Save — important on the patchy mobile data these shops often run on.
 *
 * @param {string} folder - Cloudinary folder ('products' | 'shop-logo' | ...)
 * @param {string} value - current image URL, if any
 * @param {(url: string) => void} onChange
 * @param {'square'|'round'} shape
 */
export default function ImageUploader({ folder, value, onChange, shape = 'square', label = 'Photo' }) {
  const [preview, setPreview] = useState(value || '');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const validate = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, or WEBP image.');
      return false;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB.`);
      return false;
    }
    return true;
  };

  const handleFile = useCallback(
    async (file) => {
      if (!file || !validate(file)) return;
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      setIsUploading(true);
      setProgress(0);
      try {
        const { url } = await uploadImage(file, folder, setProgress);
        onChange(url);
        setPreview(url);
        toast.success('Image uploaded');
      } catch (err) {
        toast.error(err.message || 'Upload failed. Check your connection and try again.');
        setPreview(value || '');
      } finally {
        setIsUploading(false);
      }
    },
    [folder, onChange, value]
  );

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview('');
    onChange('');
  };

  const shapeClass = shape === 'round' ? 'rounded-full' : 'rounded-card';

  return (
    <div>
      {label && <span className="mb-1 block text-sm font-medium text-gray-600">{label}</span>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed bg-brand-50 transition ${shapeClass} ${
          isDragging ? 'border-brand-500 bg-brand-100' : 'border-brand-200'
        }`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand-300">
            <HiOutlineCloudArrowUp className="h-7 w-7" />
            <span className="text-[10px] font-medium">Upload</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
            <span className="text-xs font-semibold">{progress}%</span>
          </div>
        )}

        {preview && !isUploading && (
          <button
            onClick={handleRemove}
            className="absolute -right-1 -top-1 rounded-full bg-white text-red-500 shadow"
            aria-label="Remove image"
          >
            <HiOutlineXCircle className="h-5 w-5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="mt-1 text-[11px] text-gray-400">JPG, PNG or WEBP · up to {MAX_SIZE_MB}MB</p>
    </div>
  );
}
