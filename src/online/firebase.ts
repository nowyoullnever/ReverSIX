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
  config.storageBucket &&
  config.messagingSenderId &&
  config.appId,
);
let pending: ReturnType<typeof connect> | undefined;
let reported = new Set<string>();
function codeOf(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}
function classify(error: unknown) {
  const code = codeOf(error).toLowerCase();
  const message = error instanceof Error ? error.message : String(error);
  if (message === "ONLINE PLAY IS NOT CONFIGURED") return message;
  if (code.includes("permission-denied") || code === "permission_denied") return "DATABASE PERMISSION DENIED";
  if (code.includes("network") || code.includes("unavailable") || code.includes("disconnected")) return "ONLINE NETWORK UNAVAILABLE";
  if (code.startsWith("auth/") || code.includes("invalid-api-key")) return "ONLINE AUTHENTICATION FAILED";
  return "ONLINE UNEXPECTED ERROR";
}
export function onlineError(operation: string, error: unknown) {
  const code = codeOf(error);
  const message = error instanceof Error ? error.message : String(error);
  const key = `${operation}:${code}:${message}`;
  if (!reported.has(key)) {
    reported.add(key);
    console.error("[ReverSix online]", { operation, name: error instanceof Error ? error.name : typeof error, code, message, error });
  }
  return new Error(classify(error));
}
export async function onlineOperation<T>(operation: string, operationFn: () => Promise<T>) {
  try { return await operationFn(); }
  catch (error) { throw onlineError(operation, error); }
}
async function connect() {
  if (!firebaseConfigured) throw new Error("ONLINE PLAY IS NOT CONFIGURED");
  return onlineOperation("firebase initialization", async () => {
    const app = initializeApp(config);
    const auth = getAuth(app);
    try { await auth.authStateReady(); }
    catch (error) { throw onlineError("auth state ready", error); }
    let user = auth.currentUser;
    if (!user) {
      try { user = (await signInAnonymously(auth)).user; }
      catch (error) { throw onlineError("anonymous auth", error); }
    }
    return { db: getDatabase(app), uid: user.uid };
  });
}
export function connection() {
  return (pending ??= connect().catch((error) => {
    pending = undefined;
    throw error;
  }));
}
