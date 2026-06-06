import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { USE_MOCK, hasGooglePlaces, hasAnthropic, hasFirecrawl } from '../backend/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockCompetitors.json'), 'utf-8')
);

const MIN_COMPETITORS = 3;
const MAX_COMPETITORS = 5;

const COMPETITOR_FIELDS = ['name', 'website', 'strengths', 'weaknesses', 'targetMarket', 'theyHaveYouDont'];
const ARRAY_FIELDS = ['strengths', 'weaknesses', 'theyHaveYouDont'];

const BENCHMARK_SYSTEM = `You are a competitive analysis consultant. Compare local competitors directly to the user's business.

Rules:
- Base every point on the provided competitor data (Google listing + scraped website content)
- Do not invent services, pricing, or features not supported by the data
- strengths: 2-4 specific things each competitor does well
- weaknesses: 2-4 honest gaps or shortcomings for each competitor
- targetMarket: who this competitor appears to serve based on their content and listing
- theyHaveYouDont: 2-4 specific offerings, features, or positioning the competitor has that the user's business lacks
- Compare implicitly using the user's business profile and prior analysis
- Do not include the user's own business as a competitor

Return ONLY valid JSON matching this exact schema:
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

function mockFallback(reason) {
  console.warn(`[benchmarkAgent] Falling back to mock data: ${reason}`);
  return { ...mockData, mock: true };
}

function shouldUseMock() {
  if (USE_MOCK) return true;
  if (!hasGooglePlaces || !hasAnthropic) return true;
  return false;
}

function extractDomain(url) {
  if (!url) return '';
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildSearchQuery(business) {
  const primaryService = business.services?.[0] || 'local business';
  const type = business.type || 'service provider';
  const location = business.location || 'local area';
  return `${type} ${primaryService}`;
}

function getPlaceName(place) {
  return place.displayName?.text || place.displayName || 'Unknown';
}

function isOwnBusiness(place, business) {
  const placeName = normalizeName(getPlaceName(place));
  const businessName = normalizeName(business.name);
  const placeDomain = extractDomain(place.websiteUri);
  const businessDomain = extractDomain(business.website);

  if (businessName && placeName && (placeName.includes(businessName) || businessName.includes(placeName))) {
    return true;
  }
  if (businessDomain && placeDomain && placeDomain === businessDomain) {
    return true;
  }
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

function padCompetitors(competitors) {
  if (competitors.length >= MIN_COMPETITORS) return competitors.slice(0, MAX_COMPETITORS);

  const padded = [...competitors];
  const mockPool = mockData.competitors || [];

  for (const mock of mockPool) {
    if (padded.length >= MIN_COMPETITORS) break;
    const exists = padded.some((c) => normalizeName(c.name) === normalizeName(mock.name));
    if (!exists) padded.push(mock);
  }

  return padded.slice(0, MAX_COMPETITORS);
}

async function scrapeCompetitorsInParallel(places, onLog) {
  const canScrape = hasFirecrawl && !USE_MOCK;

  if (!canScrape) {
    onLog?.('Website scrape unavailable — using Google listing data only');
  }

  return Promise.all(
    places.map(async (place) => {
      const name = getPlaceName(place);
      const website = place.websiteUri || '';

      let scraped = { content: '', mock: true };
      if (website && canScrape) {
        onLog?.(`Scraping ${name} website...`);
        try {
          scraped = await scrapeWebsite(website);
        } catch (err) {
          console.warn(`[benchmarkAgent] Scrape failed for ${website}: ${err.message}`);
          onLog?.(`Could not scrape ${name} — using listing data`);
        }
      }

      return {
        name,
        website,
        address: place.formattedAddress || '',
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        scrapedContent: scraped.content?.slice(0, 12000) || '',
        scrapeMock: scraped.mock ?? false,
      };
    })
  );
}

function normalizeStringArray(value, fieldName, min = 2, max = 4) {
  if (!Array.isArray(value)) {
    throw new Error(`competitor.${fieldName} must be an array`);
  }

  const items = value.map((item) => String(item).trim()).filter(Boolean);
  if (items.length < min) {
    throw new Error(`competitor.${fieldName} must have at least ${min} items`);
  }
  return items.slice(0, max);
}

function validateAndNormalize(parsed) {
  const competitors = parsed?.competitors;
  if (!Array.isArray(competitors) || competitors.length === 0) {
    throw new Error('Missing competitors array in LLM response');
  }

  const normalized = competitors.map((comp, index) => {
    if (!comp?.name?.trim()) throw new Error(`competitor[${index}].name is required`);

    const result = { name: comp.name.trim() };
    for (const field of COMPETITOR_FIELDS) {
      if (field === 'name') continue;
      if (ARRAY_FIELDS.includes(field)) {
        result[field] = normalizeStringArray(comp[field], field);
      } else {
        const value = String(comp[field] || '').trim();
        if (!value) throw new Error(`competitor[${index}].${field} is required`);
        result[field] = value;
      }
    }
    return result;
  });

  return { competitors: padCompetitors(normalized), mock: false };
}

export async function* streamBenchmark(context) {
  const { business, analysis } = context;
  if (!business) throw new Error('Business profile required');
  if (!analysis) throw new Error('Analysis required');

  yield { type: 'log', message: 'Starting competitor benchmark...' };
  await delay(300);

  if (shouldUseMock()) {
    yield { type: 'log', message: `Searching for competitors near ${business.location}...` };
    await delay(500);
    yield { type: 'log', message: `Found ${mockData.competitors.length} similar businesses` };
    await delay(400);
    for (const comp of mockData.competitors) {
      yield { type: 'log', message: `Analyzing ${comp.name}...` };
      await delay(350);
    }
    yield { type: 'log', message: 'Comparing competitors to your business...' };
    await delay(400);
    const result = mockFallback('USE_MOCK enabled or API keys missing');
    yield { type: 'log', message: 'Benchmark complete' };
    yield { type: 'complete', ...result };
    return;
  }

  try {
    const query = buildSearchQuery(business);
    yield { type: 'log', message: `Searching for competitors near ${business.location}...` };

    const { places } = await searchPlaces(query, business.location);
    const filtered = filterCompetitors(places, business);

    if (filtered.length === 0) {
      yield { type: 'log', message: 'No competitors found — using demo data' };
      const result = mockFallback('Google Places returned no results');
      yield { type: 'complete', ...result };
      return;
    }

    yield { type: 'log', message: `Found ${filtered.length} similar business${filtered.length > 1 ? 'es' : ''}` };

    const pendingLogs = [];
    const competitorData = await scrapeCompetitorsInParallel(filtered, (msg) => pendingLogs.push(msg));
    for (const msg of pendingLogs) {
      yield { type: 'log', message: msg };
    }

    yield { type: 'log', message: 'Comparing competitors to your business...' };

    const { content } = await callSonnet({
      system: BENCHMARK_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Compare these competitors to the user's business.

--- USER BUSINESS ---
${JSON.stringify(business, null, 2)}

--- USER ANALYSIS (Agent 2) ---
${JSON.stringify(analysis, null, 2)}

--- COMPETITOR DATA ---
${JSON.stringify(competitorData, null, 2)}`,
        },
      ],
    });

    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed);

    yield { type: 'log', message: `Benchmark complete — ${result.competitors.length} competitors analyzed` };
    yield { type: 'complete', ...result };
  } catch (err) {
    yield { type: 'log', message: 'Switching to backup competitor data...' };
    const result = mockFallback(err.message);
    yield { type: 'complete', ...result };
  }
}

export async function benchmarkAgent(context) {
  let result = null;
  for await (const event of streamBenchmark(context)) {
    if (event.type === 'complete') result = event;
  }
  return { competitors: result.competitors, mock: result.mock };
}
