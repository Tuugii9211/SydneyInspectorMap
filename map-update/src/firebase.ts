import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const envConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const usable = (c?: FirebaseOptions | null): c is FirebaseOptions => !!c?.apiKey && !!c?.projectId;

/**
 * Config comes from .env.local when it's filled in. Otherwise, when the site is served by
 * Firebase Hosting, it's read from the reserved /__/firebase/init.json URL — so the deployed
 * site works without any .env file.
 */
async function loadConfig(): Promise<FirebaseOptions | null> {
  if (usable(envConfig)) return envConfig;
  try {
    const res = await fetch('/__/firebase/init.json');
    if (!res.ok) return null;
    const config = (await res.json()) as FirebaseOptions;
    return usable(config) ? config : null;
  } catch {
    return null; // e.g. local dev server without .env.local
  }
}

let dbPromise: Promise<Firestore | null> | null = null;

/** Resolves to null when no Firebase config is available — the map still works, reports are disabled. */
export function getDb(): Promise<Firestore | null> {
  dbPromise ??= loadConfig().then(config => (config ? getFirestore(initializeApp(config)) : null));
  return dbPromise;
}
