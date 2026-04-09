// Firebase Client SDK configuration - lazy initialization to avoid build-time crashes
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getApp(): FirebaseApp {
  if (_app) return _app;
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase API key is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY.");
  }
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return _app;
}

// Lazy proxies that only initialize when actually used at runtime
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getApp());
    return Reflect.get(_auth, prop);
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getApp());
    return Reflect.get(_db, prop);
  },
});

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) {
    if (!_storage) _storage = getStorage(getApp());
    return Reflect.get(_storage, prop);
  },
});

export default new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return Reflect.get(getApp(), prop);
  },
});
