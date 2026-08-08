import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { HiMicrophone } from 'react-icons/hi2';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import ImageUploader from '../common/ImageUploader';
import { createProduct, updateProduct, createCategory } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';
import { SUPPORTS_SPEECH_RECOGNITION } from '../../utils/voiceParser';

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'plate', 'cup', 'box'];

// The app's UI language and the mic's dictation language are separate
// choices, but defaulting dictation to match the UI saves a tap for the
// common case where the shop owner speaks the language they've set the app to.
const UI_TO_VOICE_LANG = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };

function capitalizeWords(str) {
  return str.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

export default function ProductFormModal({ isOpen, onClose, product, categories }) {
  const { t, i18n } = useTranslation();
  const shopId = useAuthStore((s) => s.user?.shopId);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isDictatingName, setIsDictatingName] = useState(false);
  const nameDictationRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm({ defaultValues: product || defaultValues() });

  useEffect(() => {
    reset(product || defaultValues());
    setImageUrl(product?.imageUrl || '');
  }, [product, reset]);

  // Stop any in-progress dictation if the modal closes mid-listen.
  useEffect(() => {
    if (!isOpen) nameDictationRef.current?.stop();
  }, [isOpen]);

  function defaultValues() {
    return {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      categoryId: categories[0]?.id || '',
      purchasePrice: '',
      sellingPrice: '',
      gstRate: 5,
      openingStock: 0,
      minStock: 5,
      unit: 'pcs',
      status: 'active',
      voiceAliases: ''
    };
  }

  // Speaks the product name straight into the field — handy at billing-rush
  // times when typing Tamil/Hindi script on a phone keyboard is slow, or
  // when adding several new items to the menu at once.
  const toggleNameDictation = () => {
    if (isDictatingName) {
      nameDictationRef.current?.stop();
      return;
    }
    if (!SUPPORTS_SPEECH_RECOGNITION) return;

    let recognition;
    try {
      const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognitionImpl();
    } catch {
      toast.error(t('voice.genericError'));
      return;
    }

    recognition.lang = UI_TO_VOICE_LANG[i18n.language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsDictatingName(true);
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim();
      if (text) setValue('name', capitalizeWords(text), { shouldValidate: true, shouldDirty: true });
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(t('voice.genericError'));
      }
    };
    recognition.onend = () => setIsDictatingName(false);

    nameDictationRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsDictatingName(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await createCategory(shopId, newCategory.trim());
    toast.success(t('productForm.categoryAddedToast'));
    setNewCategory('');
  };

  const onSubmit = async (values) => {
    setIsSaving(true);
    try {
      const payload = {
        ...values,
        purchasePrice: Number(values.purchasePrice) || 0,
        sellingPrice: Number(values.sellingPrice) || 0,
        gstRate: Number(values.gstRate) || 0,
        openingStock: Number(values.openingStock) || 0,
        minStock: Number(values.minStock) || 0,
        imageUrl
      };

      if (product?.id) {
        await updateProduct(shopId, product.id, payload);
        toast.success(t('productForm.productUpdatedToast'));
      } else {
        await createProduct(shopId, payload);
        toast.success(t('productForm.productAddedToast'));
      }
      onClose();
    } catch (err) {
      toast.error(err.message || t('productForm.saveFailedToast'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? t('productForm.editTitle') : t('productForm.addTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <ImageUploader folder="products" value={imageUrl} onChange={setImageUrl} label={t('productForm.productPhoto')} />

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-600">{t('productForm.productName')}</span>
          <div className="relative">
            <input
              {...register('name', { required: t('productForm.required') })}
              placeholder={t('productForm.productNamePlaceholder')}
              className={`w-full rounded-card border border-gray-200 bg-white px-4 py-3 text-base focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 ${
                SUPPORTS_SPEECH_RECOGNITION ? 'pr-12' : ''
              } ${errors.name ? 'border-red-400' : ''}`}
            />
            {SUPPORTS_SPEECH_RECOGNITION && (
              <button
                type="button"
                onClick={toggleNameDictation}
                aria-label={t('voice.title')}
                className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition ${
                  isDictatingName ? 'animate-pulse bg-red-500 text-white' : 'bg-brand-50 text-brand-600'
                }`}
              >
                <HiMicrophone className="h-4 w-4" />
              </button>
            )}
          </div>
          {errors.name && <span className="mt-1 block text-xs text-red-500">{errors.name.message}</span>}
          <p className="mt-1 text-xs text-gray-400">
            {isDictatingName ? t('productForm.listeningShort') : SUPPORTS_SPEECH_RECOGNITION ? t('productForm.voiceNameHint') : ''}
          </p>
        </div>

        <Input label={t('productForm.description')} {...register('description')} />

        <div>
          <Input
            label={t('productForm.voiceAliasesLabel')}
            placeholder={t('productForm.voiceAliasesPlaceholder')}
            {...register('voiceAliases')}
          />
          <p className="mt-1 text-xs text-gray-400">{t('productForm.voiceAliasesHint')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input label={t('productForm.sku')} {...register('sku')} />
          <Input label={t('productForm.barcode')} {...register('barcode')} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-600">{t('productForm.category')}</span>
          <select {...register('categoryId')} className="w-full rounded-card border border-gray-200 px-4 py-3 text-base">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="mt-1 flex gap-2">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t('productForm.newCategoryPlaceholder')}
              className="flex-1 rounded-card border border-gray-200 px-3 py-1.5 text-xs"
            />
            <button type="button" onClick={handleAddCategory} className="text-xs font-semibold text-brand-500">
              {t('productForm.addCategory')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label={t('productForm.purchasePrice')}
            type="number"
            step="0.01"
            {...register('purchasePrice')}
          />
          <Input
            label={t('productForm.sellingPrice')}
            type="number"
            step="0.01"
            {...register('sellingPrice', { required: t('productForm.required') })}
            error={errors.sellingPrice?.message}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input label={t('productForm.gstPercent')} type="number" {...register('gstRate')} />
          <Input label={t('productForm.openingStock')} type="number" {...register('openingStock')} />
          <Input label={t('productForm.minStockAlert')} type="number" {...register('minStock')} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-600">{t('productForm.unit')}</span>
          <select {...register('unit')} className="w-full rounded-card border border-gray-200 px-4 py-3 text-base">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-600">{t('productForm.status')}</span>
          <select {...register('status')} className="w-full rounded-card border border-gray-200 px-4 py-3 text-base">
            <option value="active">{t('productForm.statusActive')}</option>
            <option value="inactive">{t('productForm.statusInactive')}</option>
          </select>
        </div>

        <Button type="submit" loading={isSaving}>
          {product ? t('productForm.saveChanges') : t('productForm.addProduct')}
        </Button>
      </form>
    </Modal>
  );
}
