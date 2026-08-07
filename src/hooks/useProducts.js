import { useEffect, useState } from 'react';
import { subscribeToActiveProducts, subscribeToCategories } from '../services/productService';
import { useAuthStore } from '../store/authStore';

/**
 * Realtime by design: the Billing screen must reflect a price change or a
 * newly-added product within a second, with zero manual refresh, because
 * the cashier will never think to pull-to-refresh mid-rush.
 */
export function useActiveProducts() {
  const shopId = useAuthStore((s) => s.user?.shopId);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    setIsLoading(true);
    const unsubscribe = subscribeToActiveProducts(shopId, (items) => {
      setProducts(items);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [shopId]);

  return { products, isLoading };
}

export function useCategories() {
  const shopId = useAuthStore((s) => s.user?.shopId);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!shopId) return;
    return subscribeToCategories(shopId, setCategories);
  }, [shopId]);

  return categories;
}
