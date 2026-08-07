import { collection } from 'firebase/firestore';
import { db } from './config';

/**
 * Every document below is scoped under /shops/{shopId}/... where shopId is
 * always the owning Google account's own uid — see authService and
 * settingsService.ensureShopProvisioned. There's no separate /users
 * collection: the Firebase Auth account IS the shop.
 */
export const shopsCol = () => collection(db, 'shops');

export const categoriesCol = (shopId) => collection(db, 'shops', shopId, 'categories');
export const productsCol = (shopId) => collection(db, 'shops', shopId, 'products');
export const customersCol = (shopId) => collection(db, 'shops', shopId, 'customers');
export const ordersCol = (shopId) => collection(db, 'shops', shopId, 'orders');
export const expensesCol = (shopId) => collection(db, 'shops', shopId, 'expenses');
export const suppliersCol = (shopId) => collection(db, 'shops', shopId, 'suppliers');
export const purchasesCol = (shopId) => collection(db, 'shops', shopId, 'purchases');
export const settingsDoc = (shopId) => collection(db, 'shops', shopId, 'settings');
