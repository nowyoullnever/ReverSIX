import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase } from "firebase/database";
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const firebaseConfigured = Boolean(
  config.apiKey &&
  config.authDomain &&
  config.databaseURL &&
  config.projectId &&
  config.appId,
);
let pending: ReturnType<typeof connect> | undefined;
async function connect() {
  if (!firebaseConfigured) throw new Error("ONLINE PLAY IS NOT CONFIGURED");
  const app = initializeApp(config);
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { db: getDatabase(app), uid: user.uid };
}
export function connection() {
  return (pending ??= connect().catch((error) => {
    pending = undefined;
    throw error;
  }));
}
