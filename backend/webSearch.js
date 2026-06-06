import { useMockFor } from './config.js';

const DIRECTORY_DOMAINS = [
  'yelp.com',
  'tripadvisor.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'tiktok.com',
  'google.com',
  'maps.google.com',
  'wikipedia.org',
  'reddit.com',
  'indeed.com',
  'yellowpages.com',
  'bbb.org',
  'mapquest.com',
  'chamberofcommerce.com',
  'foursquare.com',
  'opentable.com',
  'grubhub.com',
  'doordash.com',
  'ubereats.com',
  'youtube.com',
  'pinterest.com',
];

export function isDirectoryOrAggregatorUrl(url) {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
    return DIRECTORY_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return true;
  }
}

export function extractBusinessNameFromTitle(title, url = '') {
  const raw = String(title || '').trim();
  if (!raw) {
    try {
      const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
      return host.split('.')[0].replace(/-/g, ' ');
    } catch {
      return 'Unknown';
    }
  }

  const cleaned = raw
    .replace(/^\d+\.\s*/, '')
    .replace(/^(best|top)\s+\d+\s+/i, '')
    .split(/\s*[|\-–—:]\s*/)[0]
    .replace(/\s+in\s+.+$/i, '')
    .replace(/\s+near\s+.+$/i, '')
    .trim();

  return cleaned || raw;
}

function normalizeResults(data) {
  const items = data?.data || data?.results || [];
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      title: item.title || item.metadata?.title || '',
      url: item.url || item.link || '',
      description: item.description || item.metadata?.description || '',
      markdown: item.markdown || item.content || '',
    }))
    .filter((item) => item.url && !isDirectoryOrAggregatorUrl(item.url));
}

export async function searchWeb(query, options = {}) {
  const cleanQuery = String(query || '').trim();
  const location = String(options.location || '').trim();
  const limit = options.limit ?? 6;
  const withScrape = options.scrape ?? true;

  if (!cleanQuery) {
    return { results: [], query: cleanQuery, location, mock: false };
  }

  if (useMockFor('firecrawl')) {
    return { results: [], query: cleanQuery, location, mock: true };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  const searchQuery = location ? `${cleanQuery} near ${location}` : cleanQuery;
  const body = {
    query: searchQuery,
    limit,
  };

  if (withScrape) {
    body.scrapeOptions = {
      formats: ['markdown'],
      onlyMainContent: true,
    };
  }

  if (location) {
    body.location = location;
  }

  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 90000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Firecrawl search failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    results: normalizeResults(data),
    query: searchQuery,
    location,
    mock: false,
  };
}
