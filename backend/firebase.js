import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;
let initError = null;

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }
  }

  const localJsonPath = join(__dirname, '..', 'service-account.json');
  if (existsSync(localJsonPath)) {
    try {
      return JSON.parse(readFileSync(localJsonPath, 'utf-8'));
    } catch (err) {
      console.warn(`[firebase] Failed to parse local service-account.json: ${err.message}`);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  }

  if (!projectId || !clientEmail || !privateKey) return null;

  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

export function getFirebaseStatus() {
  const serviceAccount = getServiceAccount();
  return {
    configured: Boolean(serviceAccount),
    connected: Boolean(db),
    projectId: serviceAccount?.project_id || serviceAccount?.projectId || null,
    error: initError,
  };
}

export function initFirebase() {
  if (db) return db;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    initError = 'Missing Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)';
    console.warn(`[firebase] ${initError}`);
    return null;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    initError = null;
    console.log(`[firebase] Connected to Firestore (project: ${serviceAccount.project_id || serviceAccount.projectId})`);
    return db;
  } catch (err) {
    initError = err.message;
    console.warn(`[firebase] Init failed: ${err.message}`);
    return null;
  }
}

export function isFirebaseConfigured() {
  return Boolean(getServiceAccount());
}

const MAX_FIELD_CHARS = 50000;

function truncateString(value, max = MAX_FIELD_CHARS) {
  if (typeof value !== 'string' || value.length <= max) return value;
  return `${value.slice(0, max)}… [truncated ${value.length - max} chars]`;
}

export function sanitizeForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'string') return truncateString(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(val);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return value;
}

export async function createCompany(data) {
  const firestore = initFirebase();
  if (!firestore) {
    console.warn('[firebase] Skipping createCompany — not connected');
    return { id: null, saved: false, error: initError || 'Firebase not configured' };
  }

  try {
    const now = new Date().toISOString();
    const ref = firestore.collection('companies').doc();
    const payload = sanitizeForFirestore({ ...data, createdAt: now, updatedAt: now });

    await ref.set(payload);
    console.log(`[firebase] Created company ${ref.id} (step: ${data.step || 'unknown'})`);
    return { id: ref.id, saved: true };
  } catch (err) {
    console.error(`[firebase] createCompany failed: ${err.message}`);
    return { id: null, saved: false, error: err.message };
  }
}

export async function updateCompany(companyId, data) {
  const firestore = initFirebase();
  if (!firestore || !companyId) {
    console.warn(`[firebase] Skipping updateCompany — firestore=${Boolean(firestore)} companyId=${companyId}`);
    return { saved: false, error: initError || 'Firebase not configured or missing companyId' };
  }

  try {
    const payload = sanitizeForFirestore({ ...data, updatedAt: new Date().toISOString() });
    await firestore.collection('companies').doc(companyId).set(payload, { merge: true });
    console.log(`[firebase] Updated company ${companyId} (step: ${data.step || 'unknown'})`);
    return { saved: true };
  } catch (err) {
    console.error(`[firebase] updateCompany failed for ${companyId}: ${err.message}`);
    return { saved: false, error: err.message };
  }
}

export async function getCompany(companyId) {
  const firestore = initFirebase();
  if (!firestore || !companyId) return null;

  const doc = await firestore.collection('companies').doc(companyId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getCompanyForUser(companyId, userId) {
  const company = await getCompany(companyId);
  if (!company) return null;
  if (company.userId && company.userId !== userId) return null;
  return company;
}

export async function listCompaniesForUser(userId, limit = 50) {
  const firestore = initFirebase();
  if (!firestore || !userId) return [];

  try {
    const snap = await firestore
      .collection('companies')
      .where('userId', '==', userId)
      .limit(limit * 2)
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          url: data.url || '',
          step: data.step || 'unknown',
          businessName: data.business?.name || null,
          location: data.business?.location || null,
          leadCount: Array.isArray(data.leads) ? data.leads.length : 0,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      })
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, limit);
  } catch (err) {
    console.error(`[firebase] listCompaniesForUser failed: ${err.message}`);
    return [];
  }
}
