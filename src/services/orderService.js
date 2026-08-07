import { addDoc, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured, getFirebaseSetupMessage } from '../firebase/config';
import { ordersCol } from '../firebase/collections';

function ensureDbReady() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(getFirebaseSetupMessage());
  }
}

/**
 * Invoice numbers must never collide or skip in a way that looks wrong on a
 * printed bill, so the counter lives in a transaction: read current value,
 * write current+1, and stamp the order with the number we just reserved —
 * all atomically, even if two cashiers bill at the same second.
 */
async function reserveInvoiceNumber(shopId) {
  ensureDbReady();
  const counterRef = doc(db, 'shops', shopId, 'settings', 'counters');
  const nextNumber = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? snap.data().invoiceSeq ?? 0 : 0;
    const next = current + 1;
    tx.set(counterRef, { invoiceSeq: next }, { merge: true });
    return next;
  });
  return nextNumber;
}

export async function saveOrder(shopId, order) {
  const invoiceSeq = await reserveInvoiceNumber(shopId);
  const docRef = await addDoc(ordersCol(shopId), {
    ...order,
    invoiceSeq,
    createdAt: serverTimestamp()
  });
  return { id: docRef.id, invoiceSeq };
}

export async function getShopSettings(shopId) {
  ensureDbReady();
  const snap = await getDoc(doc(db, 'shops', shopId, 'settings', 'general'));
  return snap.exists() ? snap.data() : null;
}
