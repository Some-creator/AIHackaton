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

function canonicalHost(hostname) {
  const host = String(hostname || '').replace(/^www\./i, '').toLowerCase();
  if (host === 'm.facebook.com') return 'facebook.com';
  if (host === 'mobile.twitter.com') return 'twitter.com';
  return host;
}

function getRootDomain(hostname) {
  const host = canonicalHost(hostname);
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return host;
  return parts.slice(-2).join('.');
}

function isSocialHostname(hostname) {
  const host = canonicalHost(hostname);
  if (SOCIAL_ROOT_DOMAINS.has(host)) return true;
  return SOCIAL_ROOT_DOMAINS.has(getRootDomain(host));
}

/** Client-side check before we hit the server. */
export function validateBusinessUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter your business website URL.' };
  }

  const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(withProto);
  } catch {
    return {
      ok: false,
      error: "That doesn't look like a valid URL. Try something like yourbusiness.com",
    };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: 'Use a normal website address (https://yourbusiness.com).' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes('.')) {
    return {
      ok: false,
      error: 'Enter a full domain like yourbusiness.com — not just a single word.',
    };
  }

  if (host === 'localhost' || host.endsWith('.local')) {
    return {
      ok: false,
      error: "Local addresses won't work — use a public website anyone can visit.",
    };
  }

  if (isSocialHostname(host)) {
    return {
      ok: false,
      error: 'Paste your business website here, not a social profile. Add Instagram or Facebook in the optional field below.',
    };
  }

  const normalized = withProto.replace(/\/+$/, '') || withProto;
  return { ok: true, url: normalized };
}

/** Turn backend/scraper errors into plain language for the form. */
export function humanizeIngestError(message) {
  const m = String(message || '').trim();
  if (!m) return 'Something went wrong. Check your URL and try again.';

  if (/Social media URLs/i.test(m)) {
    return 'That looks like a social media link. Enter your business website above — social links go in the optional field.';
  }
  if (/Website URL is required/i.test(m)) {
    return 'Enter your business website URL.';
  }
  if (/empty content|returned no data|Could not read website|Firecrawl returned empty/i.test(m)) {
    return "We couldn't read that website. Check the spelling, make sure the site is online, and try your homepage URL.";
  }
  if (/404|not found/i.test(m)) {
    return "That page wasn't found. Double-check the URL or try your homepage (e.g. yourbusiness.com) instead.";
  }
  if (/403|forbidden|blocked/i.test(m)) {
    return 'That site blocked our scanner. Try your main homepage URL instead of a deep page.';
  }
  if (/timed out|timeout|ETIMEDOUT/i.test(m)) {
    return 'The request timed out. Try a shorter homepage URL or wait a moment and try again.';
  }
  if (/Connection to ingestion stream lost|stream lost/i.test(m)) {
    return 'We lost connection while reading your site. Make sure the backend is running and try again.';
  }
  if (/backend unavailable|Could not reach the backend|dev:backend/i.test(m)) {
    return m;
  }
  if (/NO_SCANS|out of scans/i.test(m)) {
    return m;
  }
  if (/FIRECRAWL|ANTHROPIC.*not set|API keys/i.test(m)) {
    return "Analysis isn't available right now — our server is missing a required API key. Try again later.";
  }

  return m;
}
