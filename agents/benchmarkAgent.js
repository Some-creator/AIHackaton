import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { USE_MOCK, hasGooglePlaces, hasAnthropic, hasFirecrawl } from '../backend/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const printMockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockCompetitors.json'), 'utf-8')
);
const cafeMockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/cafeCompetitors.json'), 'utf-8')
);

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
- Use the user's business profile AND Agent 2 analysis to frame comparisons
- Do not include the user's own business as a competitor
- Return exactly one competitor object per business listed in COMPETITOR DATA — use the exact same name spelling
- Never add businesses that are not in COMPETITOR DATA
- Ignore any unrelated industries (e.g. print shops for a café)

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

function getBusinessIndustryProfile(business, analysis) {
  return [
    business.name,
    business.type,
    business.targetMarket,
    ...(business.services || []),
    ...(analysis?.strengths || []),
    ...(analysis?.weaknesses || []),
    ...(analysis?.improvements || []),
    ...(analysis?.missing || []),
  ].join(' ').toLowerCase();
}

function isFoodBeverageBusiness(profile) {
  return /coffee|cafe|café|espresso|latte|kahfe|kahfé|barista|beverage|tea|boba|bubble|juice|smoothie|drink|refresh|cater|mobile vendor|food|bakery|restaurant|matcha/i.test(profile);
}

function isPrintBusiness(profile) {
  return /print|mail|graphic|signage|copy center|promotional product/i.test(profile);
}

function selectMockData(business, analysis) {
  const profile = getBusinessIndustryProfile(business, analysis);
  if (isFoodBeverageBusiness(profile)) return cafeMockData;
  if (isPrintBusiness(profile)) return printMockData;
  return cafeMockData;
}

function mockFallback(reason, business, analysis) {
  const mockData = selectMockData(business, analysis);
  console.warn(`[benchmarkAgent] Falling back to mock data: ${reason}`);
  return { ...mockData, mock: true, mockReason: reason };
}

function getMockBlockReason() {
  if (USE_MOCK) return 'USE_MOCK is enabled';
  if (!hasAnthropic) return 'ANTHROPIC_API_KEY is missing';
  if (!hasGooglePlaces) return 'GOOGLE_PLACES_API_KEY is missing';
  return null;
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

function inferIndustryQueries(business, analysis) {
  const profile = getBusinessIndustryProfile(business, analysis);
  const queries = [];

  if (isFoodBeverageBusiness(profile)) {
    queries.push(
      'coffee shop',
      'cafe',
      'specialty coffee',
      'coffee and tea',
      'bubble tea',
      'juice bar',
      'espresso bar',
    );
    if (/cater|event|mobile|wedding/i.test(profile)) {
      queries.push('mobile coffee catering', 'event beverage catering', 'coffee cart');
    }
  }

  if (isPrintBusiness(profile)) {
    queries.push('print shop', 'commercial printing', 'direct mail printing');
  }

  if (queries.length === 0) {
    queries.push(business.services?.[0] || business.type || 'local business');
  }

  return queries;
}

function buildSearchQueries(business, analysis) {
  const industry = inferIndustryQueries(business, analysis);
  const services = (business.services || []).slice(0, 3);

  return [...new Set([
    ...industry,
    ...services,
    business.type,
  ].filter(Boolean))];
}

function isRelevantCompetitor(place, business, analysis) {
  const profile = getBusinessIndustryProfile(business, analysis);
  const placeText = `${getPlaceName(place)} ${place.formattedAddress || ''}`.toLowerCase();

  if (isFoodBeverageBusiness(profile)) {
    if (/print|graphics|copy center|signage|framing|mail|fedex office|ups store/i.test(placeText)) {
      return false;
    }
  }

  if (isPrintBusiness(profile)) {
    if (/coffee|cafe|espresso|boba|smoothie|bakery/i.test(placeText) && !/print/i.test(placeText)) {
      return false;
    }
  }

  return true;
}

async function findCompetitorPlaces(business, analysis, onLog) {
  const location = business.location || 'local area';
  const queries = buildSearchQueries(business, analysis);
  const seen = new Set();
  const collected = [];

  onLog?.(`Industry search terms: ${queries.slice(0, 4).join(', ')}`);

  for (let i = 0; i < queries.length; i++) {
    if (collected.length >= MAX_COMPETITORS) break;

    const query = queries[i];
    if (i > 0) {
      onLog?.(`Broadening search: "${query}"...`);
    }

    const { places } = await searchPlaces(query, location);
    for (const place of places || []) {
      if (collected.length >= MAX_COMPETITORS) break;
      if (isOwnBusiness(place, business)) continue;
      if (!isRelevantCompetitor(place, business, analysis)) {
        onLog?.(`Skipping irrelevant result: ${getPlaceName(place)}`);
        continue;
      }

      const id = place.id || getPlaceName(place);
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push(place);
    }
  }

  return { filtered: collected, query: queries[0] || 'local business' };
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

function alignCompetitorsWithSource(parsed, competitorData) {
  const sourceByName = new Map(
    competitorData.map((c) => [normalizeName(c.name), c])
  );

  const aligned = [];
  for (const comp of parsed.competitors || []) {
    const key = normalizeName(comp.name);
    const source = sourceByName.get(key);
    if (!source) continue;

    aligned.push({
      ...comp,
      name: source.name,
      website: comp.website?.trim() || source.website || '',
    });
  }

  if (aligned.length === 0) {
    throw new Error('LLM returned competitors that do not match Google Places results');
  }

  return aligned;
}

function validateAndNormalize(parsed, competitorData) {
  const aligned = alignCompetitorsWithSource(parsed, competitorData);

  const normalized = aligned.map((comp, index) => {
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

  return { competitors: normalized.slice(0, MAX_COMPETITORS), mock: false };
}

export async function* streamBenchmark(context) {
  const { business, analysis } = context;
  if (!business) throw new Error('Business profile required');
  if (!analysis) throw new Error('Analysis required — run Agent 2 first');

  yield { type: 'log', message: 'Starting competitor benchmark...' };
  await delay(300);
  yield { type: 'log', message: `Using Agent 2 analysis (${analysis.strengths?.length || 0} strengths, ${analysis.missing?.length || 0} gaps identified)` };

  const mockBlockReason = getMockBlockReason();
  if (mockBlockReason) {
    yield { type: 'log', message: `Competitor search unavailable — ${mockBlockReason}` };
    await delay(300);
    const mockData = selectMockData(business, analysis);
    yield { type: 'log', message: `Using industry-matched demo competitors (${mockData.competitors.length} businesses)` };
    await delay(400);
    for (const comp of mockData.competitors) {
      yield { type: 'log', message: `Analyzing ${comp.name}...` };
      await delay(350);
    }
    yield { type: 'log', message: 'Benchmark complete (demo data)' };
    const result = mockFallback(mockBlockReason, business, analysis);
    yield { type: 'complete', ...result };
    return;
  }

  try {
    yield { type: 'log', message: `Searching Google Places near ${business.location}...` };

    const pendingSearchLogs = [];
    const { filtered, query } = await findCompetitorPlaces(business, analysis, (msg) => pendingSearchLogs.push(msg));
    for (const msg of pendingSearchLogs) {
      yield { type: 'log', message: msg };
    }

    if (filtered.length === 0) {
      yield { type: 'log', message: `No relevant competitors found for "${query}" in ${business.location} — using industry demo data` };
      const result = mockFallback(`Google Places returned no relevant results for ${business.location}`, business, analysis);
      yield { type: 'complete', ...result };
      return;
    }

    yield {
      type: 'log',
      message: `Found ${filtered.length} relevant business${filtered.length > 1 ? 'es' : ''} (search: "${query}")`,
    };

    const pendingLogs = [];
    const competitorData = await scrapeCompetitorsInParallel(filtered, (msg) => pendingLogs.push(msg));
    for (const msg of pendingLogs) {
      yield { type: 'log', message: msg };
    }

    yield { type: 'log', message: 'Comparing competitors to your business using Agent 1 profile + Agent 2 analysis...' };

    const { content } = await callSonnet({
      system: BENCHMARK_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Compare these competitors to the user's business. The user runs a ${isFoodBeverageBusiness(getBusinessIndustryProfile(business, analysis)) ? 'food/beverage' : 'local'} business — only analyze the listed competitors, do not substitute businesses from other industries.

--- USER BUSINESS (Agent 1) ---
${JSON.stringify(business, null, 2)}

--- USER ANALYSIS (Agent 2) ---
${JSON.stringify(analysis, null, 2)}

--- COMPETITOR DATA (from Google Places) ---
${JSON.stringify(competitorData, null, 2)}`,
        },
      ],
    });

    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed, competitorData);

    yield { type: 'log', message: `Benchmark complete — ${result.competitors.length} competitors analyzed` };
    yield { type: 'complete', ...result };
  } catch (err) {
    yield { type: 'log', message: 'Switching to industry-matched backup competitor data...' };
    const result = mockFallback(err.message, business, analysis);
    yield { type: 'complete', ...result };
  }
}

export async function benchmarkAgent(context) {
  let result = null;
  for await (const event of streamBenchmark(context)) {
    if (event.type === 'complete') result = event;
  }
  return { competitors: result.competitors, mock: result.mock, mockReason: result.mockReason };
}
