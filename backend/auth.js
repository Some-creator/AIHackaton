import admin from 'firebase-admin';
import { initFirebase } from './firebase.js';

export async function optionalAuth(req, _res, next) {
  req.user = null;
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();

  initFirebase();
  try {
    const token = header.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null };
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user?.uid) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  next();
}
