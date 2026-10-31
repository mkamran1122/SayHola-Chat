import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth } from 'firebase/auth';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// User-provided Firebase Configuration for SayHola
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyA1F-WlWIgUMfb7pj6CKoUYw5NDlmqsQjA",
  authDomain: "sayhola-chat.firebaseapp.com",
  databaseURL: "https://sayhola-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sayhola-chat",
  storageBucket: "sayhola-chat.firebasestorage.app",
  messagingSenderId: "979298634112",
  appId: "1:979298634112:web:8ac8adfae5481067429965",
};

const STORAGE_KEY_CONFIG = 'sayhola_firebase_config';

export function getStoredFirebaseConfig(): FirebaseConfig {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed.projectId && parsed.apiKey) {
        // Ensure databaseURL is present or derived
        if (!parsed.databaseURL) {
          parsed.databaseURL = `https://${parsed.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored Firebase config', err);
  }

  const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (envApiKey && envProjectId) {
    const envDbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || `https://${envProjectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
    return {
      apiKey: envApiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
      databaseURL: envDbUrl,
      projectId: envProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '979298634112',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:979298634112:web:8ac8adfae5481067429965',
    };
  }

  // Fallback to configured default
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveCustomFirebaseConfig(config: FirebaseConfig) {
  try {
    const ensuredConfig = {
      ...config,
      databaseURL: config.databaseURL || `https://${config.projectId}-default-rtdb.firebaseio.com`,
    };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(ensuredConfig));
    // Clear cached instances
    cachedApp = null;
    cachedDb = null;
    cachedAuth = null;
  } catch (err) {
    console.error('Failed to save Firebase config in localStorage', err);
  }
}

export function clearCustomFirebaseConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    cachedApp = null;
    cachedDb = null;
    cachedAuth = null;
  } catch (err) {
    console.error('Failed to clear Firebase config', err);
  }
}

export function isFirebaseConfigured(): boolean {
  const cfg = getStoredFirebaseConfig();
  return Boolean(
    cfg.projectId &&
    cfg.apiKey &&
    cfg.databaseURL &&
    (cfg.databaseURL.includes('firebaseio.com') || cfg.databaseURL.includes('firebasedatabase.app'))
  );
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Database | null = null;
let cachedAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const config = getStoredFirebaseConfig();
  if (!config.projectId || !config.apiKey) {
    return null;
  }

  if (!cachedApp) {
    try {
      if (getApps().length > 0) {
        cachedApp = getApp();
      } else {
        cachedApp = initializeApp(config);
      }
    } catch (e) {
      console.warn('Firebase initializeApp failed:', e);
      return null;
    }
  }
  return cachedApp;
}

export function getFirebaseDb(): Database | null {
  const app = getFirebaseApp();
  const config = getStoredFirebaseConfig();
  if (!app || !config.databaseURL) {
    return null;
  }

  if (!cachedDb) {
    try {
      cachedDb = getDatabase(app, config.databaseURL);
    } catch (e) {
      console.warn('Firebase getDatabase failed:', e);
      return null;
    }
  }
  return cachedDb;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (!cachedAuth) {
    try {
      cachedAuth = getAuth(app);
    } catch (e) {
      console.warn('Firebase getAuth failed:', e);
      return null;
    }
  }
  return cachedAuth;
}
