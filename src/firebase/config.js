import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyBu6i8hgTTgoi7KJ4xWMRtNukbpBq6tS2c',
  authDomain: 'billingapp-fd6d5.firebaseapp.com',
  projectId: 'billingapp-fd6d5',
  storageBucket: 'billingapp-fd6d5.firebasestorage.app',
  messagingSenderId: '460449385188',
  appId: '1:460449385188:web:80aef8accadc44e9133af1',
  measurementId: 'G-J3ZK8WXYSE'
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() || fallbackFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || fallbackFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || fallbackFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || fallbackFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || fallbackFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() || fallbackFirebaseConfig.measurementId
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
export const isFirebaseConfigured = requiredKeys.every((key) => Boolean(firebaseConfig[key]));

export function getFirebaseSetupMessage() {
  return 'Firebase is not configured yet. Add the VITE_FIREBASE_* values to your environment before signing in.';
}

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
}

export { app, auth, db };
