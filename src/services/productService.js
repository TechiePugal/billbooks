import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where
} from 'firebase/firestore';
import { productsCol, categoriesCol } from '../firebase/collections';

/**
 * The Billing screen needs every in-stock product live, all the time, so it
 * uses a realtime subscription. Inventory management (search/sort/paginate)
 * uses one-shot paginated reads instead — a live listener on a large,
 * frequently-edited product list is wasted reads for a screen an admin
 * visits occasionally.
 */
export function subscribeToActiveProducts(shopId, callback) {
  const q = query(productsCol(shopId), where('status', '==', 'active'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function fetchProductsPage(shopId, { pageSize = 20, cursor = null } = {}) {
  const constraints = [orderBy('name'), fbLimit(pageSize)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));
  const snap = await getDocs(query(productsCol(shopId), ...constraints));
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === pageSize
  };
}

export function createProduct(shopId, product) {
  return addDoc(productsCol(shopId), {
    ...product,
    createdAt: new Date().toISOString()
  });
}

export function updateProduct(shopId, productId, updates) {
  return updateDoc(doc(productsCol(shopId), productId), updates);
}

export function deleteProduct(shopId, productId) {
  return deleteDoc(doc(productsCol(shopId), productId));
}

export function subscribeToCategories(shopId, callback) {
  const q = query(categoriesCol(shopId), orderBy('name'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function createCategory(shopId, name) {
  return addDoc(categoriesCol(shopId), { name, createdAt: new Date().toISOString() });
}
