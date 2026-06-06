import { geocodeLocation, parseLocationHints, searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import {
  extractBusinessNameFromTitle,
  isDirectoryOrAggregatorUrl,
  searchWeb,
} from '../backend/webSearch.js';
import { callSonnet, callHaiku } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { hasGooglePlaces, hasAnthropic, hasFirecrawl } from '../backend/config.js';

const MAX_COMPETITORS = 5;
const MIN_COMPETITORS = 2;

const COMPETITOR_FIELDS = ['name', 'website', 'strengths', 'weaknesses', 'targetMarket', 'theyHaveYouDont'];
const ARRAY_FIELDS = ['strengths', 'weaknesses', 'theyHaveYouDont'];

const SEARCH_PLAN_SYSTEM = `You plan competitor discovery searches for a local business. Results will be gathered from Google Places and web search.

Read the business profile (Agent 1) and consultant analysis (Agent 2). Infer what the business ACTUALLY does — including every distinct concept (e.g. a hookah lounge that also serves coffee is BOTH a hookah lounge and a café, not just "café" because the name contains cafe).

CRITICAL — use business.type to decide WHO counts as a competitor:
- "mobile vendor": competitors are OTHER mobile/roving vendors (food trucks, catering trucks, mobile bars, mobile coffee carts, event vendors, pop-up operators). Search for mobile-specific terms. Do NOT search for brick-and-mortar restaurants, cafés, diners, or retail stores as competitors unless they explicitly operate a mobile unit.
- "fixed location": competitors are local brick-and-mortar businesses with a storefront or permanent address in the same category.
- "service provider": competitors are other businesses offering the same services (often office-based, home-based, or on-site service companies).

Return ONLY valid JSON:
{
  "businessSummary": "one sentence describing what this business really is",
  "serviceLines": ["string"],
  "searchQueries": ["string"],
  "excludeTypes": ["string"],
  "comparisonNotes": "how to frame competitor comparisons across all service lines"
}

Rules for searchQueries:
- 5-8 plain-English queries a customer would type into Google Maps
- Cover EVERY distinct service line with dedicated queries
- Use specific terms from services, target market, and analysis — not generic labels alone
- Short queries only (2-5 words); never include city, state, or country — location is applied separately
- Do not include the business's own name
- For mobile vendors: prefer queries like "food truck", "mobile catering", "catering truck", "mobile bar", "coffee cart", "event catering" — never generic "restaurant" or "coffee shop" alone

Rules for excludeTypes:
- Business types that are clearly NOT competitors for this specific business
- 3-6 items (e.g. "print shop" for a café, but NOT "hookah lounge" for a dual café+hookah venue)
- For mobile vendors: always exclude brick-and-mortar types like "restaurant", "diner", "cafe", "coffee shop", "retail store", "grocery" unless the user also runs a fixed location`;

const BENCHMARK_SYSTEM = `You are a competitive analysis consultant. Compare local competitors directly to the user's business.

Rules:
- Base every point on the provided competitor data (Google listing + scraped website content)
- Do not invent services, pricing, or features not supported by the data
- Match competitor type to the user's business.type: mobile vendors compete with other mobile vendors; fixed locations with storefronts; service providers with similar service businesses
- Use the SEARCH PLAN to understand ALL service lines the user operates — compare across the full offering, not just one label
- strengths: 2-4 specific things each competitor does well
- weaknesses: 2-4 honest gaps or shortcomings for each competitor
- targetMarket: who this competitor appears to serve based on their content and listing
- theyHaveYouDont: 2-4 specific offerings, features, or positioning the competitor has that the user's business lacks
- Use the user's business profile, Agent 2 analysis, and SEARCH PLAN to frame comparisons
- Do not include the user's own business as a competitor
- Return exactly one competitor object per business listed in COMPETITOR DATA — use the exact same name spelling
- Never add businesses that are not in COMPETITOR DATA
- Return ONLY valid JSON:
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

function webResultMatchesRegion(result, hints) {
  if (!hints?.stateAbbrev) return true;

  const text = `${result.title} ${result.description}`.toLowerCase();
  const stateMatch = text.match(/,\s*([a-z]{2})\b/);
  if (stateMatch && stateMatch[1] !== hints.stateAbbrev.toLowerCase()) {
    return false;
  }
  return true;
}

function webResultToCandidate(result) {
  const name = extractBusinessNameFromTitle(result.title, result.url);
  const domain = extractDomain(result.url);

  return {
    id: `web:${domain || name}`,
    displayName: { text: name },
    websiteUri: result.url,
    formattedAddress: result.description || '',
    rating: null,
    userRatingCount: null,
    location: null,
    discoverySource: 'web-search',
    preScrapedContent: result.markdown || '',
  };
}

function extractDomain(url) {
  if (!url) return '';
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '').toLowerCase();
  } catch { return ''; }
}

function stripLocationSuffix(name) {
  return String(name || '')
    .replace(/\s*[-|–—]\s+[^-|–—]+$/, '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .trim();
}

function normalizeName(name) {
  return stripLocationSuffix(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function significantWords(name) {
  return stripLocationSuffix(name)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(the|and|llc|inc|co)$/i.test(w));
}

function namesMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const wordsA = significantWords(a);
  const wordsB = significantWords(b);
  if (!wordsA.length || !wordsB.length) return false;

  const overlap = wordsA.filter((w) => wordsB.includes(w)).length;
  const threshold = Math.min(2, wordsA.length, wordsB.length);
  return overlap >= threshold;
}

function isExcludedPlace(place, excludeTypes) {
  const placeText = `${getPlaceName(place)} ${place.formattedAddress || ''}`.toLowerCase();
  return (excludeTypes || []).some((excluded) => {
    const term = String(excluded).toLowerCase().trim();
    if (term.length <= 2) return false;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(placeText);
  });
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

function candidateKey(place) {
  const domain = extractDomain(place.websiteUri);
  if (domain) return `domain:${domain}`;
  return `name:${normalizeName(getPlaceName(place))}`;
}

const MOBILE_VENDOR_SIGNALS = /\b(mobile|truck|trailer|cart|catering|pop[- ]?up|roaming|vendor|event)\b/i;
const FIXED_STOREFRONT_SIGNALS = /\b(restaurant|cafe|café|diner|bistro|bakery|coffee shop|retail store|grocery|mall|storefront)\b/i;

const MOBILE_VENDOR_SEARCH_TERMS = [
  'food truck',
  'mobile catering',
  'catering truck',
  'mobile food vendor',
  'event catering',
];

const MOBILE_VENDOR_EXCLUDES = [
  'restaurant',
  'diner',
  'cafe',
  'coffee shop',
  'retail store',
  'grocery store',
  'print shop',
];

function isMobileVendor(business) {
  return String(business?.type || '').trim().toLowerCase() === 'mobile vendor';
}

function buildMobileVendorQueries(services) {
  const queries = new Set(MOBILE_VENDOR_SEARCH_TERMS);
  for (const service of services.slice(0, 4)) {
    const s = String(service).trim();
    if (!s) continue;
    queries.add(`mobile ${s.split(/\s+/).slice(0, 2).join(' ')}`);
    queries.add(`${s.split(/\s+/).slice(0, 2).join(' ')} truck`);
  }
  return [...queries].slice(0, 8);
}

function isFixedStorefrontOnly(place) {
  const text = `${getPlaceName(place)} ${place.formattedAddress || ''}`;
  return FIXED_STOREFRONT_SIGNALS.test(text) && !MOBILE_VENDOR_SIGNALS.test(text);
}

function fallbackSearchPlan(business, analysis) {
  const services = business.services?.filter(Boolean) || [];
  const mobile = isMobileVendor(business);

  if (mobile) {
    return {
      businessSummary: `${business.name} — mobile vendor`,
      serviceLines: services.length ? services.slice(0, 4) : ['mobile vendor'],
      searchQueries: buildMobileVendorQueries(services),
      excludeTypes: MOBILE_VENDOR_EXCLUDES,
      comparisonNotes: 'Compare other mobile and event-based vendors — not brick-and-mortar restaurants or shops.',
    };
  }

  return {
    businessSummary: `${business.name} — ${business.type || 'local business'}`,
    serviceLines: services.length ? services.slice(0, 4) : [business.type || 'local business'],
    searchQueries: [...new Set([
      ...services.slice(0, 3),
      business.type,
      business.targetMarket?.split(/[,;]/)[0]?.trim(),
    ].filter(Boolean))].slice(0, 6),
    excludeTypes: ['print shop', 'shipping store', 'post office'],
    comparisonNotes: 'Compare based on listed services and target market.',
  };
}

function applyBusinessTypeSearchRules(plan, business) {
  if (!isMobileVendor(business)) return plan;

  const mergedExcludes = [...new Set([
    ...MOBILE_VENDOR_EXCLUDES,
    ...(plan.excludeTypes || []),
  ])];

  const hasMobileQuery = (plan.searchQueries || []).some((q) => MOBILE_VENDOR_SIGNALS.test(q));
  const searchQueries = hasMobileQuery
    ? plan.searchQueries
    : [...new Set([...buildMobileVendorQueries(business.services || []), ...(plan.searchQueries || [])])].slice(0, 8);

  return {
    ...plan,
    searchQueries,
    excludeTypes: mergedExcludes,
    comparisonNotes: plan.comparisonNotes?.includes('mobile')
      ? plan.comparisonNotes
      : 'Compare other mobile and event-based vendors in the same service category — not brick-and-mortar-only businesses.',
  };
}

function normalizeSearchPlan(raw, business, analysis) {
  const fallback = fallbackSearchPlan(business, analysis);
  const plan = raw && typeof raw === 'object' ? raw : {};

  const searchQueries = (Array.isArray(plan.searchQueries) ? plan.searchQueries : [])
    .map((q) => String(q).trim())
    .filter(Boolean)
    .slice(0, 8);

  const serviceLines = (Array.isArray(plan.serviceLines) ? plan.serviceLines : [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  const excludeTypes = (Array.isArray(plan.excludeTypes) ? plan.excludeTypes : [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  const normalized = {
    businessSummary: String(plan.businessSummary || fallback.businessSummary).trim(),
    serviceLines: serviceLines.length ? serviceLines : fallback.serviceLines,
    searchQueries: searchQueries.length ? searchQueries : fallback.searchQueries,
    excludeTypes: excludeTypes.length ? excludeTypes : fallback.excludeTypes,
    comparisonNotes: String(plan.comparisonNotes || fallback.comparisonNotes).trim(),
  };

  return applyBusinessTypeSearchRules(normalized, business);
}

async function planCompetitorSearch(business, analysis) {
  if (!hasAnthropic) {
    return fallbackSearchPlan(business, analysis);
  }

  try {
    const { content } = await callHaiku({
      system: SEARCH_PLAN_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Plan competitor searches for this business.

Business type: ${business.type || 'unknown'}
${isMobileVendor(business)
  ? 'This is a MOBILE VENDOR — find other mobile vendors, food trucks, catering trucks, and event operators. Exclude brick-and-mortar-only restaurants and shops.'
  : business.type === 'fixed location'
    ? 'This is a FIXED LOCATION business — find brick-and-mortar competitors with storefronts in the area.'
    : 'This is a SERVICE PROVIDER — find other businesses offering the same services.'}

--- BUSINESS PROFILE (Agent 1) ---
${JSON.stringify(business, null, 2)}

--- ANALYSIS (Agent 2) ---
${JSON.stringify(analysis, null, 2)}`,
        },
      ],
      maxTokens: 1024,
    });

    return normalizeSearchPlan(parseClaudeJson(content), business, analysis);
  } catch (err) {
    console.warn(`[benchmarkAgent] Search plan failed: ${err.message}`);
    return fallbackSearchPlan(business, analysis);
  }
}

function addCompetitorCandidate(collected, seen, place, business, searchPlan, onLog) {
  if (collected.length >= MAX_COMPETITORS) return false;
  if (isOwnBusiness(place, business)) return false;
  if (isMobileVendor(business) && isFixedStorefrontOnly(place)) {
    onLog?.(`Skipping brick-and-mortar business: ${getPlaceName(place)}`);
    return false;
  }
  if (isExcludedPlace(place, searchPlan.excludeTypes)) {
    onLog?.(`Skipping excluded type: ${getPlaceName(place)}`);
    return false;
  }

  const key = candidateKey(place);
  if (seen.has(key)) return false;
  seen.add(key);
  collected.push(place);
  return true;
}

async function searchGooglePlacesForCandidates({
  business,
  searchPlan,
  queries,
  location,
  anchor,
  collected,
  seen,
  onLog,
  relaxed = false,
}) {
  if (!hasGooglePlaces) return 0;

  let added = 0;
  const label = relaxed ? 'Google Places (broadened)' : 'Google Places';

  if (!relaxed) {
    onLog?.('Searching Google Places...');
  } else {
    onLog?.('Broadening Google Places search...');
  }

  for (let i = 0; i < queries.length; i++) {
    if (collected.length >= MAX_COMPETITORS) break;

    const query = queries[i];
    if (i > 0 || relaxed) {
      onLog?.(`${label}: "${query}"...`);
    }

    const { places, rawCount } = await searchPlaces(query, location, {
      anchor,
      relaxed,
      onSkip: ({ name, address, reason }) => {
        onLog?.(`Skipping distant result: ${name}${address ? ` (${address})` : ''} — ${reason}`);
      },
    });

    if (rawCount > 0 && places.length === 0) {
      onLog?.(`Google returned ${rawCount} result${rawCount === 1 ? '' : 's'} for "${query}" but all were filtered out`);
    }

    for (const place of places || []) {
      if (addCompetitorCandidate(
        collected,
        seen,
        { ...place, discoverySource: relaxed ? 'google-places-broad' : 'google-places' },
        business,
        searchPlan,
        onLog
      )) {
        added += 1;
        onLog?.(`Found: ${getPlaceName(place)}`);
      }
    }
  }

  return added;
}

async function findCompetitorCandidates(business, searchPlan, onLog) {
  const location = business.location || 'local area';
  const queries = searchPlan.searchQueries;
  const seen = new Set();
  const collected = [];
  const locationHints = parseLocationHints(location);

  onLog?.(`AI summary: ${searchPlan.businessSummary}`);
  onLog?.(`Service lines: ${searchPlan.serviceLines.join(', ')}`);
  onLog?.(`Search queries: ${queries.slice(0, 5).join(', ')}`);

  if (location === 'Unknown' || location === 'local area') {
    onLog?.('Warning: business location is vague — competitor search works best with a city/state');
  }

  const anchor = await geocodeLocation(location);
  if (anchor) {
    onLog?.(`Anchoring search to ${location}`);
  } else {
    onLog?.(`Could not geocode ${location} — using text-based local search`);
  }

  // Location-in-query search first — returns businesses in the target city, not just the metro box
  await searchGooglePlacesForCandidates({
    business,
    searchPlan,
    queries,
    location,
    anchor,
    collected,
    seen,
    onLog,
    relaxed: true,
  });

  if (collected.length === 0) {
    await searchGooglePlacesForCandidates({
      business,
      searchPlan,
      queries,
      location,
      anchor,
      collected,
      seen,
      onLog,
      relaxed: false,
    });
  }

  if (hasFirecrawl) {
    onLog?.('Searching the web for local competitors...');
    for (let i = 0; i < queries.length; i++) {
      if (collected.length >= MAX_COMPETITORS) break;

      const query = queries[i];
      try {
        const { results } = await searchWeb(query, { location, limit: 8, scrape: false });
        if (!results.length) {
          onLog?.(`Web search returned no business sites for "${query}"`);
        }

        for (const result of results) {
          if (collected.length >= MAX_COMPETITORS) break;
          if (isDirectoryOrAggregatorUrl(result.url)) continue;
          if (!webResultMatchesRegion(result, locationHints)) {
            onLog?.(`Skipping web result outside region: ${result.title}`);
            continue;
          }

          const candidate = webResultToCandidate(result);
          if (addCompetitorCandidate(collected, seen, candidate, business, searchPlan, onLog)) {
            onLog?.(`Web result: ${getPlaceName(candidate)}`);
          }
        }
      } catch (err) {
        console.warn(`[benchmarkAgent] Web search failed for "${query}": ${err.message}`);
        onLog?.(`Web search failed for "${query}" — continuing`);
      }
    }
  }

  if (collected.length === 0) {
    onLog?.('No competitors passed filters — check location, API keys, or search queries');
  }

  return { filtered: collected, query: queries[0] || 'local business' };
}

async function scrapeCompetitorsInParallel(places, onLog) {
  const canScrape = hasFirecrawl;
  if (!canScrape) onLog?.('Website scraping unavailable — using Google listing data only');

  return Promise.all(
    places.map(async (place) => {
      const name = getPlaceName(place);
      const website = place.websiteUri || '';

      let scrapedContent = place.preScrapedContent?.slice(0, 10000) || '';

      if (!scrapedContent && website && canScrape) {
        onLog?.(`Scraping ${name} website...`);
        try {
          const scraped = await scrapeWebsite(website);
          scrapedContent = scraped.content?.slice(0, 10000) || '';
        } catch (err) {
          console.warn(`[benchmarkAgent] Scrape failed for ${website}: ${err.message}`);
          onLog?.(`Could not scrape ${name} — using listing data`);
        }
      } else if (scrapedContent) {
        onLog?.(`Using web search content for ${name}`);
      }

      return {
        name,
        website,
        address: place.formattedAddress || '',
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        discoverySource: place.discoverySource || 'unknown',
        scrapedContent,
      };
    })
  );
}

function normalizeStringArray(value, fieldName, min = 1, max = 3) {
  if (!Array.isArray(value)) throw new Error(`competitor.${fieldName} must be an array`);
  const items = value.map((item) => String(item).trim()).filter(Boolean);
  if (items.length < min) throw new Error(`competitor.${fieldName} must have at least ${min} item`);
  return items.slice(0, max);
}

function findSourceForLlmName(llmName, competitorData, usedIndices) {
  for (let i = 0; i < competitorData.length; i++) {
    if (usedIndices.has(i)) continue;
    if (namesMatch(llmName, competitorData[i].name)) {
      return { source: competitorData[i], index: i };
    }
  }
  return null;
}

function alignCompetitorsWithSource(parsed, competitorData) {
  const usedIndices = new Set();
  const aligned = [];

  for (const comp of parsed.competitors || []) {
    const match = findSourceForLlmName(comp.name, competitorData, usedIndices);
    if (match) {
      usedIndices.add(match.index);
      aligned.push({
        ...comp,
        name: match.source.name,
        website: comp.website?.trim() || match.source.website || '',
      });
    }
  }

  if (aligned.length > 0) return aligned;

  const llmComps = parsed.competitors || [];
  const pairCount = Math.min(llmComps.length, competitorData.length);

  if (pairCount > 0) {
    console.warn('[benchmarkAgent] Fuzzy name match failed — pairing analysis to discovered businesses by order');
    return Array.from({ length: pairCount }, (_, i) => ({
      ...llmComps[i],
      name: competitorData[i].name,
      website: llmComps[i].website?.trim() || competitorData[i].website || '',
    }));
  }

  throw new Error('LLM returned competitors that do not match discovered competitor results');
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
        if (!value && field !== 'website') {
          throw new Error(`competitor[${index}].${field} is required`);
        }
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

  if (!hasGooglePlaces) {
    yield { type: 'error', error: 'Competitor search unavailable — GOOGLE_PLACES_API_KEY not configured' };
    return;
  }
  if (!hasAnthropic) {
    yield { type: 'error', error: 'AI analysis unavailable — ANTHROPIC_API_KEY not configured' };
    return;
  }

  yield { type: 'log', message: 'Starting competitor benchmark...' };
  await delay(300);
  yield { type: 'log', message: `Using Agent 2 analysis (${analysis.strengths?.length || 0} strengths, ${analysis.missing?.length || 0} gaps identified)` };

  yield { type: 'log', message: 'AI is determining what competitors to search for...' };
  const searchPlan = await planCompetitorSearch(business, analysis);
  yield { type: 'log', message: `Identified: ${searchPlan.businessSummary}` };
  yield { type: 'log', message: `Service lines: ${searchPlan.serviceLines.join(', ')}` };

  yield { type: 'log', message: 'Starting competitor search...' };
  await delay(300);

  try {
    const sources = [
      hasGooglePlaces ? 'Google Places' : null,
      hasFirecrawl ? 'web search' : null,
    ].filter(Boolean).join(' + ') || 'local directories';

    yield { type: 'log', message: `Searching competitors near ${business.location} via ${sources}...` };

    const pendingSearchLogs = [];
    const { filtered, query } = await findCompetitorCandidates(business, searchPlan, (msg) => pendingSearchLogs.push(msg));
    for (const msg of pendingSearchLogs) {
      yield { type: 'log', message: msg };
    }

    if (filtered.length === 0) {
      yield { type: 'error', error: `No competitors found for "${query}" near ${business.location}. Try updating the location or services in your profile.` };
      return;
    }

    yield {
      type: 'log',
      message: `Found ${filtered.length} business${filtered.length > 1 ? 'es' : ''} (first query: "${query}")`,
    };

    const pendingLogs = [];
    const competitorData = await scrapeCompetitorsInParallel(filtered, (msg) => pendingLogs.push(msg));
    for (const msg of pendingLogs) yield { type: 'log', message: msg };

    yield { type: 'log', message: 'AI is comparing competitors to your business profile...' };

    const competitorNameList = competitorData
      .map((comp, i) => `${i + 1}. ${comp.name}`)
      .join('\n');

    const { content } = await callSonnet({
      system: BENCHMARK_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Compare these competitors to the user's business.

You MUST return exactly ${competitorData.length} competitors using these EXACT names (one per line):
${competitorNameList}

--- SEARCH PLAN (AI-derived) ---
${JSON.stringify(searchPlan, null, 2)}

--- USER BUSINESS (Agent 1) ---
${JSON.stringify(business, null, 2)}

--- USER ANALYSIS (Agent 2) ---
${JSON.stringify(analysis, null, 2)}

--- COMPETITOR DATA (from Google Places + web search) ---
${JSON.stringify(competitorData, null, 2)}`,
        },
      ],
    });

    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed, competitorData);

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
