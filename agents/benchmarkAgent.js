import { searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { hasGooglePlaces, hasAnthropic, hasFirecrawl } from '../backend/config.js';

const MAX_COMPETITORS = 5;
const MIN_COMPETITORS = 2;

const COMPETITOR_FIELDS = ['name', 'website', 'strengths', 'weaknesses', 'targetMarket', 'theyHaveYouDont'];
const ARRAY_FIELDS = ['strengths', 'weaknesses', 'theyHaveYouDont'];

const BENCHMARK_SYSTEM = `You are a competitive analyst. Compare these competitors to the user's business directly.

Rules:
- Base every point on the provided data (Google listing + scraped website)
- Be concise: 2 points max per list, one sentence each
- strengths: what they do well vs. the user
- weaknesses: real gaps you can see in their offering
- targetMarket: who they serve, one sentence
- theyHaveYouDont: specific things they offer that the user doesn't
- Do not include the user's own business

Return ONLY valid JSON:
{
  "competitors": [
    {
      "name": "string",
      "website": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "targetMarket": "string",
      "theyHaveYouDont": ["string"]
    }
  ]
}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractDomain(url) {
  if (!url) return '';
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '').toLowerCase();
  } catch { return ''; }
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildSearchQuery(business) {
  const primaryService = business.services?.[0] || 'local business';
  const secondaryService = business.services?.[1] || '';
  const type = (business.type || '').toLowerCase();
  const serviceTerms = [primaryService, secondaryService].filter(Boolean).slice(0, 2).join(' ');
  if (type === 'mobile vendor') return `mobile ${primaryService}`;
  return serviceTerms || primaryService;
}

function getPlaceName(place) {
  return place.displayName?.text || place.displayName || 'Unknown';
}

function isOwnBusiness(place, business) {
  const placeName = normalizeName(getPlaceName(place));
  const businessName = normalizeName(business.name);
  const placeDomain = extractDomain(place.websiteUri);
  const businessDomain = extractDomain(business.website);
  if (businessName && placeName && (placeName.includes(businessName) || businessName.includes(placeName))) return true;
  if (businessDomain && placeDomain && placeDomain === businessDomain) return true;
  return false;
}

function filterCompetitors(places, business) {
  const seen = new Set();
  const filtered = [];
  for (const place of places) {
    if (isOwnBusiness(place, business)) continue;
    const id = place.id || getPlaceName(place);
    if (seen.has(id)) continue;
    seen.add(id);
    filtered.push(place);
    if (filtered.length >= MAX_COMPETITORS) break;
  }
  return filtered;
}

async function scrapeCompetitorsInParallel(places, onLog) {
  const canScrape = hasFirecrawl;
  if (!canScrape) onLog?.('Website scraping unavailable — using Google listing data only');

  return Promise.all(places.map(async (place) => {
    const name = getPlaceName(place);
    const website = place.websiteUri || '';
    let scraped = { content: '', mock: true };
    if (website && canScrape) {
      try {
        scraped = await scrapeWebsite(website);
      } catch (err) {
        console.warn(`[benchmarkAgent] Scrape failed for ${website}: ${err.message}`);
      }
    }
    return {
      name,
      website,
      address: place.formattedAddress || '',
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? null,
      scrapedContent: scraped.content?.slice(0, 10000) || '',
    };
  }));
}

function normalizeStringArray(value, fieldName, min = 1, max = 3) {
  if (!Array.isArray(value)) throw new Error(`competitor.${fieldName} must be an array`);
  const items = value.map((item) => String(item).trim()).filter(Boolean);
  if (items.length < min) throw new Error(`competitor.${fieldName} must have at least ${min} item`);
  return items.slice(0, max);
}

function validateAndNormalize(parsed) {
  const competitors = parsed?.competitors;
  if (!Array.isArray(competitors) || competitors.length === 0) throw new Error('Missing competitors array in response');

  const normalized = competitors.map((comp, index) => {
    if (!comp?.name?.trim()) throw new Error(`competitor[${index}].name is required`);
    const result = { name: comp.name.trim() };
    for (const field of COMPETITOR_FIELDS) {
      if (field === 'name') continue;
      if (ARRAY_FIELDS.includes(field)) {
        result[field] = normalizeStringArray(comp[field], field);
      } else {
        // website is optional
        result[field] = String(comp[field] || '').trim();
        if (!result[field] && field !== 'website') {
          throw new Error(`competitor[${index}].${field} is required`);
        }
      }
    }
    return result;
  });

  return { competitors: normalized.slice(0, MAX_COMPETITORS), mock: false };
}

export async function* streamBenchmark(context) {
  const { business, analysis } = context;
  if (!business) throw new Error('Business profile required');
  if (!analysis) throw new Error('Analysis required');

  if (!hasGooglePlaces) {
    yield { type: 'error', error: 'Competitor search unavailable — GOOGLE_PLACES_API_KEY not configured' };
    return;
  }
  if (!hasAnthropic) {
    yield { type: 'error', error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' };
    return;
  }

  yield { type: 'log', message: 'Starting competitor search...' };
  await delay(300);

  try {
    const query = buildSearchQuery(business);
    yield { type: 'log', message: `Searching for "${query}" near ${business.location}...` };

    const { places } = await searchPlaces(query, business.location);
    const filtered = filterCompetitors(places, business);

    if (filtered.length === 0) {
      yield { type: 'error', error: `No competitors found for "${query}" near ${business.location}. Try updating the location or services in your profile.` };
      return;
    }

    yield { type: 'log', message: `Found ${filtered.length} competitor${filtered.length > 1 ? 's' : ''}` };

    const pendingLogs = [];
    const competitorData = await scrapeCompetitorsInParallel(filtered, (msg) => pendingLogs.push(msg));
    for (const msg of pendingLogs) yield { type: 'log', message: msg };

    yield { type: 'log', message: 'AI analyzing competitors...' };

    const { content } = await callSonnet({
      system: BENCHMARK_SYSTEM,
      messages: [{
        role: 'user',
        content: `Compare these competitors to the user's business.\n\n--- USER BUSINESS ---\n${JSON.stringify(business, null, 2)}\n\n--- ANALYSIS ---\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPETITOR DATA ---\n${JSON.stringify(competitorData, null, 2)}`,
      }],
    });

    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed);

    if (result.competitors.length < MIN_COMPETITORS) {
      yield { type: 'error', error: `Only found ${result.competitors.length} valid competitor(s). Need at least ${MIN_COMPETITORS} for a meaningful benchmark.` };
      return;
    }

    yield { type: 'log', message: `${result.competitors.length} competitors analyzed` };
    yield { type: 'complete', ...result };
  } catch (err) {
    yield { type: 'error', error: err.message };
  }
}

export async function benchmarkAgent(context) {
  let result = null;
  for await (const event of streamBenchmark(context)) {
    if (event.type === 'complete') result = event;
    if (event.type === 'error') throw new Error(event.error);
  }
  return { competitors: result.competitors, mock: result.mock };
}
