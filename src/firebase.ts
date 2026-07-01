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

// Standard Firebase Google Sign-In with popup is perfect for the iframe if they click it,
// but just in case, we can also support a fallback email login or mock auth bypass for local sandbox testing,
// or use standard popup. In the AI Studio iframe, standard popup login might be blocked by some browsers due to cross-origin headers,
// so providing a "Mock Login / Sandbox Bypass" button alongside Google Sign-In is a spectacular UX best-practice
// so that the user is NEVER blocked from testing the app!
// Let's implement Google Sign-In but also a quick admin login bypass option when in local testing!

const defaultDb = getFirestore(app);
let currentDb: Firestore = defaultDb;

export let db: Firestore;

// Check if a client-side environment variable is present (e.g. VITE_FIRESTORE_DATABASE_ID)
const envDatabaseId = (import.meta as any).env.VITE_FIRESTORE_DATABASE_ID;
const initialDatabaseId = envDatabaseId && envDatabaseId.trim() !== "" ? envDatabaseId.trim() : null;

try {
  if (initialDatabaseId && initialDatabaseId !== "(default)") {
    currentDb = getFirestore(app, initialDatabaseId);
    console.log(`Firestore initialized with configured database: ${initialDatabaseId}`);
  } else {
    currentDb = defaultDb;
    console.log("Firestore initialized with default database: (default)");
  }
} catch (e) {
  console.warn("Failed to initialize custom Firestore database, falling back to default:", e);
  currentDb = defaultDb;
}

// Assign initial value to exported let binding
db = currentDb;

let fallbackListeners: (() => void)[] = [];

export function onDatabaseFallback(callback: () => void) {
  fallbackListeners.push(callback);
  return () => {
    fallbackListeners = fallbackListeners.filter((l) => l !== callback);
  };
}

export function fallbackToDefaultDatabase() {
  if (currentDb !== defaultDb) {
    console.warn("Critical: Database not found. Swapped Firestore instance to (default) dynamically.");
    currentDb = defaultDb;
    db = currentDb; // Update exported live binding
    fallbackListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error executing database fallback listener:", err);
      }
    });
    return true;
  }
  return false;
}

export function setFirestoreDatabaseId(databaseId: string) {
  const targetId = databaseId && databaseId.trim() !== "" ? databaseId.trim() : "(default)";
  if (targetId === "(default)") {
    if (currentDb !== defaultDb) {
      currentDb = defaultDb;
      db = currentDb; // Update exported live binding
      console.log("Firestore database ID dynamically reset to: (default)");
      fallbackListeners.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          console.error("Error executing database fallback listener:", err);
        }
      });
    }
  } else {
    try {
      const newDb = getFirestore(app, targetId);
      currentDb = newDb;
      db = currentDb; // Update exported live binding
      console.log(`Firestore database ID dynamically set to: ${targetId}`);
      fallbackListeners.forEach((listener) => {
        try {
          listener();
        } catch (err) {
          console.error("Error executing database fallback listener:", err);
        }
      });
    } catch (e) {
      console.warn(`Failed to set Firestore database ID to ${targetId}, falling back to default:`, e);
      currentDb = defaultDb;
      db = currentDb; // Update exported live binding
    }
  }
}

const storage = getStorage(app);

export { app, auth, googleProvider, storage, signInWithPopup, signOut };
