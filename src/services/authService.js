import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured, getFirebaseSetupMessage } from '../firebase/config';
import { ensureShopProvisioned } from './settingsService';

const googleProvider = new GoogleAuthProvider();
// Always show the account chooser — a shop's phone may have several
// Google accounts signed in, and silently reusing the last one is a
// common source of "wrong shop's data" confusion.
googleProvider.setCustomParameters({ prompt: 'select_account' });

function ensureAuthReady() {
  if (!isFirebaseConfigured || !auth) {
    throw new Error(getFirebaseSetupMessage());
  }
}

/**
 * One Google account = one shop. There's no separate signup step, no
 * admin/cashier distinction, and no manual Firestore setup: the very
 * first sign-in from a given account provisions that account's shop.
 */
export async function signInWithGoogle() {
  ensureAuthReady();
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureShopProvisioned(cred.user);
  return cred.user;
}

export function logout() {
  if (!isFirebaseConfigured || !auth) return Promise.resolve();
  return firebaseSignOut(auth);
}

function toAppUser(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    shopId: firebaseUser.uid, // the account IS the shop
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email,
    photoURL: firebaseUser.photoURL
  };
}

export function subscribeToAuthChanges(callback) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? toAppUser(firebaseUser) : null);
  });
}
