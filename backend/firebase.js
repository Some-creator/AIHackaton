import admin from 'firebase-admin';

let db = null;

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch {
      console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT is not valid JSON');
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;

  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

export function initFirebase() {
  if (db) return db;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  try {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log('[firebase] Connected to Firestore');
    return db;
  } catch (err) {
    console.warn(`[firebase] Init failed: ${err.message}`);
    return null;
  }
}

export function isFirebaseConfigured() {
  return Boolean(getServiceAccount());
}

export async function createCompany(data) {
  const firestore = initFirebase();
  if (!firestore) return { id: null, saved: false };

  const now = new Date().toISOString();
  const ref = firestore.collection('companies').doc();

  await ref.set({
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[firebase] Created company ${ref.id}`);
  return { id: ref.id, saved: true };
}

export async function updateCompany(companyId, data) {
  const firestore = initFirebase();
  if (!firestore || !companyId) return { saved: false };

  await firestore.collection('companies').doc(companyId).set(
    { ...data, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  console.log(`[firebase] Updated company ${companyId}`);
  return { saved: true };
}

export async function getCompany(companyId) {
  const firestore = initFirebase();
  if (!firestore || !companyId) return null;

  const doc = await firestore.collection('companies').doc(companyId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}
