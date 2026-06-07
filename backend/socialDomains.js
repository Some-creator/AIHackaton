/** Social platforms by registrable domain — avoids false positives like shop.xerox.com matching x.com. */
const SOCIAL_ROOT_DOMAINS = new Set([
  'instagram.com',
  'facebook.com',
  'fb.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
]);

export function canonicalHost(hostname) {
  const host = String(hostname || '').replace(/^www\./i, '').toLowerCase();
  if (host === 'm.facebook.com') return 'facebook.com';
  if (host === 'mobile.twitter.com') return 'twitter.com';
  return host;
}

/** Last two labels (e.g. shop.xerox.com → xerox.com, mobile.x.com → x.com). */
export function getRootDomain(hostname) {
  const host = canonicalHost(hostname);
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return host;
  return parts.slice(-2).join('.');
}

export function isSocialHostname(hostname) {
  const host = canonicalHost(hostname);
  if (SOCIAL_ROOT_DOMAINS.has(host)) return true;
  return SOCIAL_ROOT_DOMAINS.has(getRootDomain(host));
}

export function isSocialUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`);
    return isSocialHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function socialRootDomain(hostname) {
  return isSocialHostname(hostname) ? getRootDomain(hostname) : null;
}
