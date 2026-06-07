import { cleanSocialUrl } from './apify.js';

const SOCIAL_HOST_RULES = [
  {
    host: /(^|\.)instagram\.com$/i,
    invalidPath: /^\/(p|reel|reels|stories|explore|accounts|direct|tv)\b/i,
    minPathDepth: 1,
  },
  {
    host: /(^|\.)facebook\.com$/i,
    invalidPath: /^\/(sharer|share|groups|events|watch|marketplace|photo\.php|story\.php)\b/i,
    minPathDepth: 1,
  },
  {
    host: /(^|\.)twitter\.com$|(^|\.)x\.com$/i,
    invalidPath: /^\/(home|search|i\/|intent\/|hashtag\/)\b/i,
    minPathDepth: 1,
  },
  {
    host: /(^|\.)tiktok\.com$/i,
    invalidPath: /^\/(foryou|following|discover|tag)\b/i,
    minPathDepth: 1,
  },
  {
    host: /(^|\.)linkedin\.com$/i,
    invalidPath: /^\/(feed|jobs|pulse|search)\b/i,
    allowedPrefixes: ['/company/', '/in/'],
  },
  {
    host: /(^|\.)youtube\.com$/i,
    invalidPath: /^\/(watch|playlist|results|shorts)\b/i,
    allowedPrefixes: ['/@', '/channel/', '/c/', '/user/'],
  },
];

const CONTENT_URL_PATTERNS = [
  /https?:\/\/(?:www\.)?instagram\.com\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?facebook\.com\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?tiktok\.com\/@?[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[\w.-]+\/?/gi,
  /(?:^|[\s(])(?:www\.)?instagram\.com\/[\w.-]+\/?/gi,
  /(?:^|[\s(])(?:www\.)?facebook\.com\/[\w.-]+\/?/gi,
  /(?:^|[\s(])(?:www\.)?(?:twitter|x)\.com\/[\w.-]+\/?/gi,
  /(?:^|[\s(])(?:www\.)?tiktok\.com\/@?[\w.-]+\/?/gi,
];

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
    return cleanSocialUrl(withProtocol);
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

  for (const raw of urls) {
    const normalized = normalizeSocialUrl(raw);
    if (!normalized || !isLikelySocialProfileUrl(normalized)) continue;

    const key = socialProfileKey(normalized);
    if (!byKey.has(key)) {
      byKey.set(key, normalized);
    }
  }

  return [...byKey.values()];
}

export function dedupeSocialScrapes(scrapes) {
  const byKey = new Map();

  for (const scrape of scrapes || []) {
    if (!scrape?.url) continue;
    const key = socialProfileKey(scrape.url);
    if (!byKey.has(key)) {
      byKey.set(key, scrape);
    }
  }

  return [...byKey.values()];
}

function isLikelySocialProfileUrl(url) {
  const normalized = normalizeSocialUrl(url);
  if (!normalized) return false;

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return false;
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const path = parsed.pathname || '/';

  const rule = SOCIAL_HOST_RULES.find((entry) => entry.host.test(host));
  if (!rule) return false;
  if (rule.invalidPath?.test(path)) return false;

  if (rule.allowedPrefixes?.length) {
    return rule.allowedPrefixes.some((prefix) => path.startsWith(prefix));
  }

  const segments = path.split('/').filter(Boolean);
  return segments.length >= (rule.minPathDepth ?? 1);
}

export function extractSocialLinksFromPage({ content = '', links = [], userProfiles = [] } = {}) {
  const candidates = [];

  for (const profile of userProfiles) {
    candidates.push(profile);
  }

  for (const link of links) {
    candidates.push(link);
  }

  for (const pattern of CONTENT_URL_PATTERNS) {
    const matches = String(content).match(pattern) || [];
    for (const match of matches) {
      candidates.push(match.trim().replace(/^[\s(]+/, ''));
    }
  }

  return dedupeSocialProfiles(candidates);
}

export function partitionSocialLinks(urls, userProfiles = []) {
  const userKeys = new Set(
    userProfiles.map((url) => normalizeSocialUrl(url)).filter(Boolean),
  );

  const fromWebsite = [];
  const fromUser = [];

  const deduped = dedupeSocialProfiles(urls);

  for (const normalized of deduped) {
    const key = socialProfileKey(normalized);
    const isUser = [...userKeys].some((userUrl) => socialProfileKey(userUrl) === key);
    if (isUser) fromUser.push(normalized);
    else fromWebsite.push(normalized);
  }

  return { fromWebsite, fromUser, all: deduped };
}
