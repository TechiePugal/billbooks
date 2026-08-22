import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiMagnifyingGlass } from 'react-icons/hi2';
import ProductCard from './ProductCard';
import CategoryFilter from './CategoryFilter';

export default function ProductGrid({ products, categories, isLoading, onAddToCart }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
      const matchesSearch = !term || p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, activeCategory]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 bg-surface px-3 pb-1.5 pt-2">
        <div className="relative">
          <HiMagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('billing.searchPlaceholder')}
            className="w-full rounded-card border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <CategoryFilter categories={categories} active={activeCategory} onChange={setActiveCategory} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-brand-50 sm:h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-400">
            {search ? t('billing.noProductsMatch') : t('billing.noProductsYet')}
          </p>
        ) : (
          // auto-rows-fr keeps every row the same height even if a row has fewer
          // items than the row above it (e.g. the last, partially-filled row).
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 auto-rows-fr">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAddToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
