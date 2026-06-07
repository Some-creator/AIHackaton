import { initFirebase } from './firebase.js';

export const SCAN_PACKS = [
  {
    id: 'solo',
    name: 'Solo Cast',
    tagline: 'One more website, fully analyzed',
    scans: 1,
    priceCents: 2900,
    priceLabel: '$29',
    perScanLabel: '$29 / scan',
  },
  {
    id: 'reel',
    name: 'The Reel Deal',
    tagline: 'Perfect when you are comparing a few prospects',
    scans: 3,
    priceCents: 6900,
    priceLabel: '$69',
    perScanLabel: '$23 / scan',
    badge: 'Most popular',
    savings: 'Save 21%',
  },
  {
    id: 'spread',
    name: 'Full Spread',
    tagline: 'For agencies and serial testers',
    scans: 5,
    priceCents: 9900,
    priceLabel: '$99',
    perScanLabel: '$19.80 / scan',
    badge: 'Best value',
    savings: 'Save 32%',
  },
];

export const FREE_SCAN_COUNT = 1;

export function getPackById(packId) {
  return SCAN_PACKS.find((p) => p.id === packId) || null;
}

function usersCollection(firestore) {
  return firestore.collection('users');
}

export async function getOrCreateUserCredits(userId, email = null) {
  const firestore = initFirebase();
  if (!firestore || !userId) {
    return {
      scansRemaining: 0,
      freeScanGranted: false,
      totalScansPurchased: 0,
      totalScansUsed: 0,
      configured: false,
    };
  }

  const ref = usersCollection(firestore).doc(userId);
  const doc = await ref.get();

  if (!doc.exists) {
    const now = new Date().toISOString();
    const initial = {
      email: email || null,
      scansRemaining: FREE_SCAN_COUNT,
      freeScanGranted: true,
      totalScansPurchased: 0,
      totalScansUsed: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(initial);
    return { ...initial, configured: true };
  }

  const data = doc.data();
  return {
    scansRemaining: data.scansRemaining ?? 0,
    freeScanGranted: Boolean(data.freeScanGranted),
    totalScansPurchased: data.totalScansPurchased ?? 0,
    totalScansUsed: data.totalScansUsed ?? 0,
    configured: true,
  };
}

export async function consumeScan(userId) {
  const firestore = initFirebase();
  if (!firestore || !userId) {
    return { ok: false, error: 'Sign in required to run a scan', scansRemaining: 0 };
  }

  const ref = usersCollection(firestore).doc(userId);

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let data;

    if (!snap.exists) {
      data = {
        scansRemaining: FREE_SCAN_COUNT,
        freeScanGranted: true,
        totalScansPurchased: 0,
        totalScansUsed: 0,
        createdAt: new Date().toISOString(),
      };
    } else {
      data = snap.data();
    }

    const remaining = data.scansRemaining ?? 0;
    if (remaining < 1) {
      return { ok: false, error: 'No scans remaining — grab a pack on Pricing', scansRemaining: 0 };
    }

    const next = {
      ...data,
      scansRemaining: remaining - 1,
      totalScansUsed: (data.totalScansUsed ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    tx.set(ref, next, { merge: true });
    return { ok: true, scansRemaining: next.scansRemaining };
  });
}

export async function purchaseScanPack(userId, packId, email = null) {
  const pack = getPackById(packId);
  if (!pack) {
    return { ok: false, error: 'Unknown scan pack' };
  }

  const firestore = initFirebase();
  if (!firestore || !userId) {
    return { ok: false, error: 'Sign in required to purchase scans' };
  }

  const ref = usersCollection(firestore).doc(userId);
  const purchasesRef = ref.collection('purchases').doc();

  const result = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = new Date().toISOString();
    let data;

    if (!snap.exists) {
      data = {
        email: email || null,
        scansRemaining: FREE_SCAN_COUNT,
        freeScanGranted: true,
        totalScansPurchased: 0,
        totalScansUsed: 0,
        createdAt: now,
      };
    } else {
      data = snap.data();
    }

    const nextRemaining = (data.scansRemaining ?? 0) + pack.scans;
    const next = {
      ...data,
      email: email || data.email || null,
      scansRemaining: nextRemaining,
      totalScansPurchased: (data.totalScansPurchased ?? 0) + pack.scans,
      updatedAt: now,
    };

    tx.set(ref, next, { merge: true });
    tx.set(purchasesRef, {
      packId: pack.id,
      packName: pack.name,
      scans: pack.scans,
      priceCents: pack.priceCents,
      priceLabel: pack.priceLabel,
      demo: true,
      createdAt: now,
    });

    return {
      ok: true,
      scansRemaining: nextRemaining,
      scansAdded: pack.scans,
      packName: pack.name,
    };
  });

  return result;
}
