import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiMagnifyingGlass } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import ProductFormModal from '../components/inventory/ProductFormModal';
import { useCategories } from '../hooks/useProducts';
import { fetchProductsPage, deleteProduct } from '../services/productService';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/billing';

export default function Inventory() {
  const { t } = useTranslation();
  const shopId = useAuthStore((s) => s.user?.shopId);
  const categories = useCategories();
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    setIsLoading(true);
    // Reasonable page size for a single-shop inventory; "Load more" appends beyond it.
    fetchProductsPage(shopId, { pageSize: 50 }).then(({ items, lastDoc, hasMore: more }) => {
      setProducts(items);
      setCursor(lastDoc);
      setHasMore(more);
      setIsLoading(false);
    });
  }, [shopId, refreshTick]);

  const loadMore = async () => {
    const { items, lastDoc, hasMore: more } = await fetchProductsPage(shopId, { pageSize: 50, cursor });
    setProducts((prev) => [...prev, ...items]);
    setCursor(lastDoc);
    setHasMore(more);
  };

  const filtered = useMemo(() => {
    let list = products;
    if (categoryFilter !== 'all') list = list.filter((p) => p.categoryId === categoryFilter);
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term));
    }
    return [...list].sort((a, b) => {
      if (sortKey === 'price') return b.sellingPrice - a.sellingPrice;
      if (sortKey === 'stock') return a.openingStock - b.openingStock;
      return a.name.localeCompare(b.name);
    });
  }, [products, search, categoryFilter, sortKey]);

  const stats = useMemo(() => {
    const lowStock = products.filter((p) => p.openingStock > 0 && p.openingStock <= (p.minStock || 0)).length;
    const outOfStock = products.filter((p) => p.openingStock <= 0).length;
    return {
      totalProducts: products.length,
      totalCategories: categories.length,
      lowStock,
      outOfStock
    };
  }, [products, categories]);

  const handleDelete = async (product) => {
    if (!window.confirm(t('inventory.deleteConfirm', { name: product.name }))) return;
    await deleteProduct(shopId, product.id);
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    toast.success(t('inventory.productDeletedToast'));
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setRefreshTick((t) => t + 1);
  };

  return (
    <div className="p-4 pb-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-brand-700">{t('inventory.title')}</h1>
        <Button
          size="sm"
          className="!w-auto px-4"
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
        >
          <span className="flex items-center gap-1">
            <HiOutlinePlus className="h-4 w-4" /> {t('inventory.addProduct')}
          </span>
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t('inventory.totalProducts')} value={stats.totalProducts} />
        <StatCard label={t('inventory.categories')} value={stats.totalCategories} />
        <StatCard label={t('inventory.lowStock')} value={stats.lowStock} tone="warn" />
        <StatCard label={t('inventory.outOfStock')} value={stats.outOfStock} tone="danger" />
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('inventory.searchPlaceholder')}
            className="w-full rounded-card border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-card border border-gray-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="all">{t('inventory.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-card border border-gray-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="name">{t('inventory.sortName')}</option>
          <option value="price">{t('inventory.sortPrice')}</option>
          <option value="stock">{t('inventory.sortStock')}</option>
        </select>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-400">{t('inventory.loadingProducts')}</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">{t('inventory.noProductsFound')}</p>
      ) : (
        <div className="overflow-hidden rounded-card bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase text-brand-500">
              <tr>
                <th className="px-3 py-2">{t('inventory.product')}</th>
                <th className="px-3 py-2">{t('inventory.price')}</th>
                <th className="px-3 py-2">{t('inventory.stock')}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="flex items-center gap-2 px-3 py-2">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-brand-50">
                      {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </td>
                  <td className="px-3 py-2">{formatCurrency(p.sellingPrice)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        p.openingStock <= 0
                          ? 'font-semibold text-red-500'
                          : p.openingStock <= (p.minStock || 0)
                          ? 'font-semibold text-amber-500'
                          : ''
                      }
                    >
                      {p.openingStock} {p.unit}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setIsModalOpen(true);
                      }}
                      className="mr-2 text-brand-500"
                      aria-label={t('common.edit')}
                    >
                      <HiOutlinePencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(p)} className="text-red-400" aria-label={t('common.delete')}>
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <button onClick={loadMore} className="w-full py-3 text-sm font-semibold text-brand-500">
              {t('inventory.loadMore')}
            </button>
          )}
        </div>
      )}

      <ProductFormModal isOpen={isModalOpen} onClose={handleModalClose} product={editingProduct} categories={categories} />
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = tone === 'danger' ? 'text-red-500' : tone === 'warn' ? 'text-amber-500' : 'text-brand-600';
  return (
    <div className="rounded-card bg-white p-3 shadow-card">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`font-display text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
