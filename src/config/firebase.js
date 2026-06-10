// src/config/firebase.js
//
// WHY A SEPARATE CONFIG FILE?
//   Firebase initialisation happens once and is reused across
//   multiple service modules (firestore.js, etc).
//   If you initialise Firebase in every file, you get errors.
//   One init here, everything else imports { db } from here.
//
// HOW SECRETS WORK HERE:
//   import.meta.env.VITE_* is Vite's way of reading .env variables.
//   At BUILD TIME, Vite replaces these with the actual values.
//   The source code never contains the real keys — only placeholders.
//   In production (Netlify), the values come from Netlify env vars.

import { initializeApp } from 'firebase/app';
import { getFirestore }  from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialise Firebase — runs once when this module is first imported.
const app = initializeApp(firebaseConfig);

// Export Firestore database instance.
// Every other service imports this — they never call initializeApp() again.
export const db = getFirestore(app);
