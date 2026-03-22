import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  // Firebase App Hosting provides default credentials automatically.
  // In development, set GOOGLE_APPLICATION_CREDENTIALS to a service account key file.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    adminApp = initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
  } else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    // Minimal init for Firebase App Hosting (uses Application Default Credentials)
    adminApp = initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  } else {
    // Fallback for environments without any Firebase config
    adminApp = initializeApp();
  }

  return adminApp;
}
