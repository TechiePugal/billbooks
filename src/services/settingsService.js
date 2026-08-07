import { doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, getFirebaseSetupMessage } from '../firebase/config';
import { categoriesCol, customersCol, ordersCol, productsCol } from '../firebase/collections';

const DEFAULT_SETTINGS = {
  address: '',
  phone: '',
  gstNumber: '',
  fssaiNumber: '',
  invoicePrefix: 'INV',
  footerMessage: 'Thank you! Visit again.',
  paperSize: '80mm',
  showLogo: true,
  showGst: true,
  showQr: true,
  qrType: 'dynamic',
  staticQrUrl: '',
  upiId: '',
  printerType: 'browser',
  autoPrint: false,
  language: 'en'
};

function ensureDbReady() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(getFirebaseSetupMessage());
  }
}

/**
 * Runs once, on a Google account's very first sign-in: creates its shop's
 * settings doc so the app has somewhere to read/write from immediately,
 * with no separate signup form and no manual Firestore setup by the owner.
 * A no-op for every sign-in after the first.
 */
export async function ensureShopProvisioned(firebaseUser) {
  ensureDbReady();
  const ref = doc(db, 'shops', firebaseUser.uid, 'settings', 'general');
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    ...DEFAULT_SETTINGS,
    shopName: firebaseUser.displayName ? `${firebaseUser.displayName}'s Shop` : 'My Shop',
    merchantName: firebaseUser.displayName || '',
    email: firebaseUser.email || '',
    createdAt: new Date().toISOString()
  });
}

export function saveShopSettings(shopId, settings) {
  ensureDbReady();
  return setDoc(doc(db, 'shops', shopId, 'settings', 'general'), settings, { merge: true });
}

/**
 * A simple JSON export of the shop's core collections. Good enough for a
 * small shop owner to keep an occasional local safety copy; for real
 * disaster recovery at scale you'd want scheduled server-side exports
 * (Firestore's managed export/import) instead of a client-triggered dump.
 */
export async function exportBackup(shopId) {
  ensureDbReady();
  const collect = async (colRef) => {
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const [products, categories, customers, orders] = await Promise.all([
    collect(productsCol(shopId)),
    collect(categoriesCol(shopId)),
    collect(customersCol(shopId)),
    collect(ordersCol(shopId))
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    shopId,
    products,
    categories,
    customers,
    orders
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foodbill-backup-${shopId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  return backup;
}

/**
 * Restores products and categories from a previously exported JSON file.
 * Orders are intentionally NOT restored automatically — re-inserting
 * historical bills risks duplicate invoice numbers and skewed reports.
 * Restore those manually if truly needed.
 */
export async function restoreBackup(shopId, backupJson) {
  ensureDbReady();
  const writes = [];
  (backupJson.categories || []).forEach((cat) => {
    writes.push(setDoc(doc(categoriesCol(shopId), cat.id), cat));
  });
  (backupJson.products || []).forEach((product) => {
    writes.push(setDoc(doc(productsCol(shopId), product.id), product));
  });
  await Promise.all(writes);
  return { restoredProducts: backupJson.products?.length || 0, restoredCategories: backupJson.categories?.length || 0 };
}
