// src/lib/firebase-admin.ts
import { getApps, initializeApp, cert, applicationDefault, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Pilih salah satu mekanisme kredensial:
 * A) Application Default Credentials (ADC) -> pakai GOOGLE_APPLICATION_CREDENTIALS (path file JSON) / GCP env
 * B) Service account JSON via env string FIREBASE_SERVICE_ACCOUNT_KEY
 */
function initAdmin(): App {
  const apps = getApps();
  if (apps.length) return apps[0];

  // A) ADC (paling mudah kalau di local set env GOOGLE_APPLICATION_CREDENTIALS=path ke JSON)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
    return initializeApp({ credential: applicationDefault() });
  }

  // B) Service account JSON disimpan di env FIREBASE_SERVICE_ACCOUNT_KEY (stringified JSON)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    return initializeApp({ credential: cert(svc) });
  }

  // C) Triplet env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const svc = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    } as const;
    return initializeApp({ credential: cert(svc) });
  }

  // (Fallback) tetap init tanpa credential -> Firestore akan error saat dipakai
  return initializeApp();
}

const adminApp = initAdmin();
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
