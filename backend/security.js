import { randomUUID } from 'crypto';

const PRIVATE_IPV4 =
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|172\.(1[6-9]|2\d|3[01])\.)/;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
]);

export function createSessionId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

export function isBlockedUrl(rawUrl) {
  if (!rawUrl) return true;

  let parsed;
  try {
    const withProto = String(rawUrl).trim().startsWith('http')
      ? String(rawUrl).trim()
      : `https://${String(rawUrl).trim()}`;
    parsed = new URL(withProto);
  } catch {
    return true;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return true;

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local')) return true;

  if (parsed.protocol === 'http:' && host === '169.254.169.254') return true;

  const ipv4Match = host.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (ipv4Match) {
    if (PRIVATE_IPV4.test(host)) return true;
  }

  return false;
}

export function assertPublicHttpUrl(rawUrl, label = 'URL') {
  if (isBlockedUrl(rawUrl)) {
    const err = new Error(`${label} is not allowed — use a public http(s) website address`);
    err.status = 400;
    throw err;
  }
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function getCorsOptions() {
  const origins = process.env.ALLOWED_ORIGINS
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origins?.length) return undefined;
  return { origin: origins, credentials: true };
}

export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 60 } = {}) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests — please try again later' });
    }

    return next();
  };
}
