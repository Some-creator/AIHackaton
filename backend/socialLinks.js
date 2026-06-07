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
  const found = new Set();

  for (const profile of userProfiles) {
    const normalized = normalizeSocialUrl(profile);
    if (normalized && isLikelySocialProfileUrl(normalized)) {
      found.add(normalized);
    }
  }

  for (const link of links) {
    const normalized = normalizeSocialUrl(link);
    if (normalized && isLikelySocialProfileUrl(normalized)) {
      found.add(normalized);
    }
  }

  for (const pattern of CONTENT_URL_PATTERNS) {
    const matches = String(content).match(pattern) || [];
    for (const match of matches) {
      const cleaned = match.trim().replace(/^[\s(]+/, '');
      const normalized = normalizeSocialUrl(cleaned);
      if (normalized && isLikelySocialProfileUrl(normalized)) {
        found.add(normalized);
      }
    }
  }

  return [...found];
}

export function partitionSocialLinks(urls, userProfiles = []) {
  const userKeys = new Set(
    userProfiles.map((url) => normalizeSocialUrl(url)).filter(Boolean),
  );

  const fromWebsite = [];
  const fromUser = [];

  for (const url of urls) {
    const normalized = normalizeSocialUrl(url);
    if (!normalized) continue;
    if ([...userKeys].some((key) => key === normalized)) {
      fromUser.push(normalized);
    } else {
      fromWebsite.push(normalized);
    }
  }

  return { fromWebsite, fromUser, all: urls.map((url) => normalizeSocialUrl(url)).filter(Boolean) };
}
