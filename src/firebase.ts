import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCL7o5jVpWZ71tDL3C_1nAwVhZZnGCncWM",
  authDomain: "studio-5830795030-1c609.firebaseapp.com",
  projectId: "studio-5830795030-1c609",
  storageBucket: "studio-5830795030-1c609.firebasestorage.app",
  messagingSenderId: "196480445362",
  appId: "1:196480445362:web:65ef2662594c07629592ab"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Safe utility to read and clean the database ID from window or vite env
const getCleanDatabaseId = (): string => {
  // 1. Try window global (injected dynamically by backend in production)
  const windowDbId = typeof window !== "undefined" ? (window as any).FIRESTORE_DATABASE_ID : undefined;
  if (windowDbId && typeof windowDbId === "string" && windowDbId.trim() !== "") {
    return windowDbId.trim();
  }

  // 2. Try Vite env variable
  const envDatabaseId = (import.meta as any).env?.VITE_FIRESTORE_DATABASE_ID;
  if (envDatabaseId && typeof envDatabaseId === "string" && envDatabaseId.trim() !== "") {
    return envDatabaseId.trim();
  }

  // Fallback to default/known database for this applet
  return "ai-studio-e14611bc-01b9-4d72-b031-180fa9b98c45";
};

const rawDbId = getCleanDatabaseId();
const finalDbId = rawDbId && rawDbId !== "(default)" ? rawDbId : "ai-studio-e14611bc-01b9-4d72-b031-180fa9b98c45";

console.log(`Firestore initializing with database ID: "${finalDbId}"`);

let currentDb: Firestore;
try {
  currentDb = getFirestore(app, finalDbId);
} catch (error) {
  console.warn("Firestore initialization failed. Falling back to default getFirestore.", error);
  currentDb = getFirestore(app);
}

export const db = currentDb;

// Provide backward-compatible mock helpers to satisfy existing imports in App.tsx
let fallbackListeners: (() => void)[] = [];

export function onDatabaseFallback(callback: () => void) {
  fallbackListeners.push(callback);
  return () => {
    fallbackListeners = fallbackListeners.filter((l) => l !== callback);
  };
}

export function fallbackToDefaultDatabase() {
  console.log("fallbackToDefaultDatabase called (no-op in optimized connection mode)");
  return false;
}

export function setFirestoreDatabaseId(databaseId: string) {
  console.log(`setFirestoreDatabaseId called with: ${databaseId}. Instance locked to initialized database ID: ${finalDbId}`);
}

const storage = getStorage(app);

export { app, auth, googleProvider, storage, signInWithPopup, signOut };
