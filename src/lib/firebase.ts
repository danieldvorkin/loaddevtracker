import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate essential env vars early to provide a clear error when missing.
const requiredKeys: Array<keyof typeof firebaseConfig> = [
  "apiKey",
  "projectId",
  "appId",
];
const missing = requiredKeys.filter((k) => !firebaseConfig[k]);
if (missing.length) {
  // Don't log the full config (secrets). Log which keys are missing.
  throw new Error(
    `Missing Firebase env vars: ${missing.join(", ")}. Ensure VITE_FIREBASE_* values are set and available to Vite.`,
  );
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Export services for use in your XState machines
export const auth = getAuth(app);
export const db = getFirestore(app);

// Determine whether to connect to emulators. Only use emulator when explicitly toggled.
// Set `VITE_USE_FIREBASE_EMULATOR=true` to force emulator usage.
const envToggle = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
const useEmulator = envToggle;

if (useEmulator) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    // eslint-disable-next-line no-console
    console.info("Connected Firebase Auth+Firestore to local emulators", {
      projectId: app.options?.projectId,
      useEmulator,
      envToggle,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to connect to Firebase emulators:", e);
  }
} else {
  // eslint-disable-next-line no-console
  console.info("Firebase running without emulator connection", {
    projectId: app.options?.projectId,
  });
}
