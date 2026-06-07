function canonicalHost(hostname) {
  const host = String(hostname || '').replace(/^www\./i, '').toLowerCase();
  if (host === 'm.facebook.com') return 'facebook.com';
  if (host === 'mobile.twitter.com') return 'twitter.com';
  return host;
}

function normalizeSocialUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed.replace(/^\/\//, '')}`;
  try {
    const parsed = new URL(withProtocol);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '') || withProtocol;
  } catch {
    return '';
  }
}

export function socialProfileKey(url) {
  const normalized = normalizeSocialUrl(url);
  if (!normalized) return String(url || '').toLowerCase().trim();

  try {
    const parsed = new URL(normalized);
    const host = canonicalHost(parsed.hostname);
    const path = parsed.pathname.replace(/\/+/g, '/').replace(/\/$/, '').toLowerCase();
    return `${host}${path}`;
  } catch {
    return normalized.toLowerCase();
  }
}

export function dedupeSocialProfiles(urls) {
  const byKey = new Map();

  for (const raw of urls || []) {
    const normalized = normalizeSocialUrl(raw);
    if (!normalized) continue;

    const key = socialProfileKey(normalized);
    if (!byKey.has(key)) {
      byKey.set(key, normalized);
    }
  }

  return [...byKey.values()];
}
