import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

/**
 * Una sola app de Firebase para toda la aplicación: la usan las cuentas (auth/firebase)
 * y los datos de la red (data/firebase). Las claves vienen de .env.local (VITE_FIREBASE_*).
 */
const env = import.meta.env;
export const CONFIG: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export interface Servicios { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage }

let servicios: Servicios | null = null;

export function firebase(): Servicios {
  if (servicios) return servicios;
  if (!CONFIG.apiKey || !CONFIG.projectId) {
    throw new Error('Faltan las claves de Firebase. Copiá .env.example a .env.local y completá VITE_FIREBASE_*.');
  }
  const app = getApps().length ? getApp() : initializeApp(CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  auth.languageCode = 'es';
  if (env.VITE_FIREBASE_EMULADORES === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  servicios = { app, auth, db, storage };
  return servicios;
}
