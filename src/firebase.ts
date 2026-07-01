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

let activeDb: Firestore;
try {
  activeDb = getFirestore(app, finalDbId);
} catch (error) {
  console.warn("Firestore initialization failed. Falling back to default getFirestore.", error);
  activeDb = getFirestore(app);
}

export const db = new Proxy({} as Firestore, {
  get(target, prop, receiver) {
    return Reflect.get(activeDb, prop, receiver);
  },
  set(target, prop, value, receiver) {
    return Reflect.set(activeDb, prop, value, receiver);
  }
});

// Provide backward-compatible mock helpers to satisfy existing imports in App.tsx
let fallbackListeners: (() => void)[] = [];

export function onDatabaseFallback(callback: () => void) {
  fallbackListeners.push(callback);
  return () => {
    fallbackListeners = fallbackListeners.filter((l) => l !== callback);
  };
}

export function fallbackToDefaultDatabase() {
  console.log("fallbackToDefaultDatabase called!");
  try {
    const defaultDb = getFirestore(app);
    if (activeDb !== defaultDb) {
      activeDb = defaultDb;
      console.log("Swapped active database to default (default)");
      fallbackListeners.forEach((callback) => {
        try {
          callback();
        } catch (e) {
          console.error("Error running database fallback listener:", e);
        }
      });
      return true;
    }
  } catch (error) {
    console.error("Error falling back to default database:", error);
  }
  return false;
}

export function setFirestoreDatabaseId(databaseId: string) {
  console.log(`setFirestoreDatabaseId called with: ${databaseId}. Checking configuration...`);
  if (databaseId === "(default)") {
    fallbackToDefaultDatabase();
  }
}

const storage = getStorage(app);

export { app, auth, googleProvider, storage, signInWithPopup, signOut };
