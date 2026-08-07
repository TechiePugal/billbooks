import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import ImageUploader from '../common/ImageUploader';
import { createProduct, updateProduct, createCategory } from '../../services/productService';
import { useAuthStore } from '../../store/authStore';

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'plate', 'cup', 'box'];

export default function ProductFormModal({ isOpen, onClose, product, categories }) {
  const shopId = useAuthStore((s) => s.user?.shopId);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ defaultValues: product || defaultValues() });

  useEffect(() => {
    reset(product || defaultValues());
    setImageUrl(product?.imageUrl || '');
  }, [product, reset]);

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

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await createCategory(shopId, newCategory.trim());
    toast.success('Category added');
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
        toast.success('Product updated');
      } else {
        await createProduct(shopId, payload);
        toast.success('Product added');
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Edit Product' : 'Add Product'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <ImageUploader folder="products" value={imageUrl} onChange={setImageUrl} label="Product photo" />

        <Input label="Product name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
        <Input label="Description" {...register('description')} />

        <div>
          <Input
            label="Voice billing names (optional)"
            placeholder="e.g. idli, இட்லி, idly"
            {...register('voiceAliases')}
          />
          <p className="mt-1 text-xs text-gray-400">
            Other ways staff say this item out loud, comma separated — in Tamil or English. Helps the
            mic on the Billing screen recognise it correctly.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input label="SKU" {...register('sku')} />
          <Input label="Barcode" {...register('barcode')} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-600">Category</span>
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
              placeholder="New category name"
              className="flex-1 rounded-card border border-gray-200 px-3 py-1.5 text-xs"
            />
            <button type="button" onClick={handleAddCategory} className="text-xs font-semibold text-brand-500">
              + Add
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Purchase price"
            type="number"
            step="0.01"
            {...register('purchasePrice')}
          />
          <Input
            label="Selling price"
            type="number"
            step="0.01"
            {...register('sellingPrice', { required: 'Required' })}
            error={errors.sellingPrice?.message}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input label="GST %" type="number" {...register('gstRate')} />
          <Input label="Opening stock" type="number" {...register('openingStock')} />
          <Input label="Min stock alert" type="number" {...register('minStock')} />
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-600">Unit</span>
          <select {...register('unit')} className="w-full rounded-card border border-gray-200 px-4 py-3 text-base">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-600">Status</span>
          <select {...register('status')} className="w-full rounded-card border border-gray-200 px-4 py-3 text-base">
            <option value="active">Active — visible on Billing screen</option>
            <option value="inactive">Inactive — hidden from Billing screen</option>
          </select>
        </div>

        <Button type="submit" loading={isSaving}>
          {product ? 'Save Changes' : 'Add Product'}
        </Button>
      </form>
    </Modal>
  );
}
