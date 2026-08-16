import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyBnCQ5Mw2avxAkxgjgaO6QFITRPvesc4Ds',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'education-news-7f9bf.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'education-news-7f9bf',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'education-news-7f9bf.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '522828191876',
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const ADMIN_EMAIL = 'admin@educationnews.com';
