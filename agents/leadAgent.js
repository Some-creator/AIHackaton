import { geocodeLocation, searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { getBusinessReviews } from '../backend/yelp.js';
import { callSonnet, callHaiku } from '../backend/anthropic.js';
import { hasAnthropic, hasGooglePlaces } from '../backend/config.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import {
  getLeadDomainProfile,
  getPlaceName,
  isExcludedPlace,
  matchesDomain,
  normalizeSignalList,
  deriveSignalsFromSources,
} from './domainProfile.js';

const MAX_LEADS = 8;
const MAX_CANDIDATES = 24;
const MIN_PRIORITY_SCORE = 5;

function meetsPriorityThreshold(lead) {
  const priority = Number(lead?.priorityScore);
  if (!Number.isFinite(priority)) return true;
  return priority >= MIN_PRIORITY_SCORE;
}

const FRANCHISE_INDICATORS = [
  'franchise', 'franchising', 'franchisee', 'franchise opportunities',
  'own a franchise', 'become a franchisee', 'franchise owner',
  'nationwide', 'locations near you', 'find a location', 'store locator',
  'our locations', 'view all locations', 'multi-location', 'chain of',
];

const KNOWN_CHAINS = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'subway', 'chipotle',
  'starbucks', 'dunkin', '7-eleven', 'circle k', 'walmart', 'target',
  'costco', 'home depot', 'lowes', 'best buy', 'cvs', 'walgreens',
  'planet fitness', 'la fitness', 'gold\'s gym', 'anytime fitness',
  'domino', 'pizza hut', 'papa john', 'little caesar', 'panera',
  'chick-fil-a', 'popeyes', 'kfc', 'sonic', 'whataburger', 'five guys',
  'raising cane', 'in-n-out', 'jack in the box', 'arbys', 'dairy queen',
  'swig', 'dutch bros', 'scooter\'s coffee', 'summer moon', 'peet\'s coffee',
  'marriott', 'hilton', 'holiday inn', 'hampton inn', 'ihg', 'hyatt',
  'shell', 'chevron', 'exxon', 'bp', 'speedway', 'quiktrip',
];

const LEAD_SEARCH_PLAN_SYSTEM = `You plan Google Places searches to find LOCAL INDEPENDENT businesses who would BUY from the user's business, based on an identified market gap.

The gap describes an underserved buyer segment. Your queries must find PROSPECT CUSTOMERS (buyers who need the user's services), NOT:
- The user's own business
- Competitors of the user (same niche as the user's business)
- Franchises, chains, or corporate multi-location brands
- Businesses in adjacent/wrong industries that would never buy from the user

Return ONLY valid JSON:
{
  "targetSummary": "one sentence describing the ideal independent lead buyer",
  "domainSignals": ["5-12 words or phrases that identify a VALID LEAD for this gap in a business name or listing — e.g. wedding venue, event planner, coworking for a coffee catering gap"],
  "excludeSignals": ["5-12 business types that are NOT valid leads — include the user's competitor categories and wrong industries"],
  "searchQueries": ["string"],
  "excludeTypes": ["string"],
  "qualificationNotes": "how to tell a good independent lead from a bad one"
}

Rules for domainSignals:
- Derived from the gap's recommendedTarget, niche, and demand — who would actually BUY the user's product/service
- Terms a user would search on Google Maps to find these buyer businesses
- Must match the gap's buyer niche, NOT the user's own business category (unless the gap explicitly targets that category)

Rules for excludeSignals:
- The user's business niche/competitor categories (they sell, not buy)
- Franchises, chains, venue operators that don't buy (food truck parks, food halls)
- Adjacent industries that are not the gap's target buyers

Rules for searchQueries:
- 5-8 short Google Maps queries (2-5 words each)
- Derived from gap niche, recommendedTarget, and demand — find businesses that NEED what the user sells
- Use concrete buyer types from recommendedTarget: "wedding venue", "coworking space", "corporate office", "event planner"
- Never include city, state, zip, or country — location is applied separately
- Never query the user's own business name, their direct competitors, or generic "restaurant"/"food" unless those are explicitly the buyer type

Rules for excludeTypes:
- Mirror excludeSignals — 4-10 adjacent categories that are NOT valid leads`;

const LEAD_NICHE_FILTER_SYSTEM = `You filter local business search results to keep ONLY valid LEAD buyers for a market gap — NOT competitors, franchises, or wrong industries.

Rules:
- A valid lead is an independent local business that would BUY from the user's business per the gap's recommendedTarget
- Use domainSignals: the business MUST match at least one signal (they are the right buyer type)
- EXCLUDE anything matching excludeSignals — user's competitor categories, franchises, venue operators, wrong industries
- EXCLUDE businesses that sell the same thing as the user (competitors), not buy it
- When unsure, EXCLUDE — quality over quantity. Return { "keep": [] } if none match.

Return ONLY valid JSON: { "keep": [0, 2] } — array of candidate index integers to keep.`;

const FRANCHISE_CLASSIFY_SYSTEM = `You classify whether a business is a franchise, national chain, or corporate multi-location brand.

Reply with ONLY "yes" or "no".

yes = national/regional chain, franchise, corporate-owned multi-location brand (McDonald's, Starbucks, 7-Eleven, Planet Fitness, hotel chains, gas station chains, etc.)
no = single independent local business, family-owned shop, one-off restaurant, or local operator even if the name sounds branded`;

const LEAD_SYSTEM = `You are a lead qualification agent. Score a LOCAL INDEPENDENT business that matches the target market gap's buyer niche.

The lead must be a plausible buyer for the user's business — not a franchise, not a competitor, and not an adjacent wrong industry.

Generate:
1. hook — the specific real reason the user should reach out right now (tie to gap buyer niche + listing/reviews)
2. fitScore, budgetScore, responseScore (1-10) — responseScore reflects how likely the owner is to respond

Return ONLY valid JSON:
{
  "hook": "string",
  "fitScore": number,
  "budgetScore": number,
  "responseScore": number
}`;

function extractContactEmail(content = '') {
  const matches = String(content).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const filtered = matches.filter((email) => {
    const lower = email.toLowerCase();
    return !lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.includes('example.com');
  });
  return filtered[0] || null;
}

function resolveGapContext(context) {
  if (Array.isArray(context.gaps)) {
    return {
      gapList: context.gaps,
      gapIndex: context.recommendedGap ?? 0,
    };
  }

  if (context.gaps?.gaps) {
    return {
      gapList: context.gaps.gaps,
      gapIndex: context.gaps.recommendedGap ?? context.recommendedGap ?? 0,
    };
  }

  return { gapList: [], gapIndex: 0 };
}

function getSelectedGap(context) {
  const { gapList, gapIndex } = resolveGapContext(context);
  return gapList[gapIndex] || gapList[0] || null;
}

function fallbackLeadSearchPlan(business, selectedGap, analysis) {
  const target = selectedGap?.recommendedTarget || selectedGap?.niche || '';
  const domainSignals = deriveSignalsFromSources({
    nicheText: target || selectedGap?.niche,
    extraTexts: [selectedGap?.demand],
  }).slice(0, 12);

  const cleanTarget = target
    .replace(/\b(b2b|corporate|specialty|boutique|artisan|high-end|premium)\b/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const firstPhrase = cleanTarget.split(/[,;]/)[0].trim();
  const queries = [...new Set([
    firstPhrase,
    cleanTarget.split(/\s+/).slice(0, 3).join(' '),
    selectedGap?.niche?.split(/\s+/).slice(0, 4).join(' '),
    business.targetMarket?.split(/[,;]/)[0]?.trim(),
  ].filter((q) => q && q.split(' ').length <= 5))].slice(0, 6);

  const excludeSignals = normalizeSignalList([
    ...(analysis?.niche ? deriveSignalsFromSources({ nicheText: analysis.niche, services: business?.services }).slice(0, 6) : []),
    'franchise', 'chain', 'food truck park', 'truck park', 'food hall',
  ]);

  return {
    targetSummary: firstPhrase || 'Local independent businesses matching the gap',
    domainSignals,
    excludeSignals,
    searchQueries: queries.length ? queries : ['local business'],
    excludeTypes: excludeSignals,
    qualificationNotes: 'Prefer independent operators matching the gap buyer type — not franchises or the user\'s competitor category.',
  };
}

function normalizeSearchPlan(raw, business, selectedGap, analysis) {
  const fallback = fallbackLeadSearchPlan(business, selectedGap, analysis);
  const plan = raw && typeof raw === 'object' ? raw : {};

  const searchQueries = (Array.isArray(plan.searchQueries) ? plan.searchQueries : [])
    .map((q) => String(q).trim())
    .filter(Boolean)
    .slice(0, 8);

  const domainSignals = normalizeSignalList(
    Array.isArray(plan.domainSignals) && plan.domainSignals.length
      ? plan.domainSignals
      : fallback.domainSignals,
  );

  const excludeSignals = normalizeSignalList([
    ...(Array.isArray(plan.excludeSignals) ? plan.excludeSignals : []),
    ...(Array.isArray(plan.excludeTypes) ? plan.excludeTypes : []),
    ...fallback.excludeSignals,
  ]);

  return {
    targetSummary: String(plan.targetSummary || fallback.targetSummary).trim(),
    domainSignals,
    excludeSignals,
    searchQueries: searchQueries.length ? searchQueries : fallback.searchQueries,
    excludeTypes: excludeSignals,
    qualificationNotes: String(plan.qualificationNotes || fallback.qualificationNotes).trim(),
  };
}

async function planLeadSearch(business, selectedGap, analysis) {
  if (!hasAnthropic) {
    return fallbackLeadSearchPlan(business, selectedGap, analysis);
  }

  try {
    const { content } = await callHaiku({
      system: LEAD_SEARCH_PLAN_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Plan lead searches for this market gap.

The user's business niche (EXCLUDE as leads unless gap explicitly targets them as buyers): ${analysis?.niche || 'unknown'}
User sells: ${(business.services || []).join(', ') || 'unknown'}

You MUST set domainSignals for the gap's BUYER type and excludeSignals for competitors/wrong industries.

--- USER BUSINESS ---
${JSON.stringify(business, null, 2)}

--- MARKET GAP (target opportunity) ---
${JSON.stringify(selectedGap, null, 2)}

--- BUSINESS ANALYSIS (context) ---
${JSON.stringify(analysis || {}, null, 2)}`,
        },
      ],
      maxTokens: 1024,
    });

    return normalizeSearchPlan(parseClaudeJson(content), business, selectedGap, analysis);
  } catch (err) {
    console.warn(`[leadAgent] Lead search plan failed: ${err.message}`);
    return fallbackLeadSearchPlan(business, selectedGap, analysis);
  }
}

function getPlaceNameLocal(place) {
  return getPlaceName(place);
}

function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
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

function isOwnBusiness(place, business) {
  const placeName = normalizeName(getPlaceNameLocal(place));
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

function isKnownChain(name) {
  const lower = String(name || '').toLowerCase();
  return KNOWN_CHAINS.some((chain) => lower.includes(chain));
}

function isCompetitorPlace(place, competitors = []) {
  const placeName = normalizeName(getPlaceNameLocal(place));
  return competitors.some((competitor) => {
    const competitorName = normalizeName(competitor.name);
    if (!competitorName || !placeName) return false;
    return placeName.includes(competitorName) || competitorName.includes(placeName);
  });
}

function isFranchiseByRules(name, content = '') {
  const lower = `${name} ${content}`.toLowerCase();
  if (isKnownChain(name)) return true;
  if (/\s#\d+\b/.test(name)) return true;
  return FRANCHISE_INDICATORS.some((indicator) => lower.includes(indicator));
}

async function isFranchise(name, content = '', place = {}) {
  if (isFranchiseByRules(name, content)) {
    return { franchise: true, reason: 'chain or franchise indicators detected' };
  }

  if (!hasAnthropic) {
    return { franchise: false, reason: null };
  }

  try {
    const { content: result } = await callHaiku({
      system: FRANCHISE_CLASSIFY_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Business name: ${name}
Address: ${place.formattedAddress || 'unknown'}
Google rating: ${place.rating ?? 'unknown'} (${place.userRatingCount ?? 0} reviews)
Website excerpt: ${content.slice(0, 2000)}`,
        },
      ],
      maxTokens: 10,
    });

    const franchise = result.trim().toLowerCase().startsWith('yes');
    return {
      franchise,
      reason: franchise ? 'AI classified as franchise/chain' : null,
    };
  } catch {
    return { franchise: false, reason: null };
  }
}

async function filterLeadCandidatesByNiche(candidates, business, selectedGap, analysis, searchPlan, domainProfile, onLog) {
  const keywordFiltered = candidates.filter((place) => matchesDomain(place, domainProfile));
  if (keywordFiltered.length === 0) return [];

  if (!hasAnthropic || keywordFiltered.length <= 1) {
    return keywordFiltered;
  }

  const entries = keywordFiltered.map((place, index) => ({
    index,
    name: getPlaceNameLocal(place),
    address: place.formattedAddress || '',
    website: place.websiteUri || '',
  }));

  try {
    const { content } = await callHaiku({
      system: LEAD_NICHE_FILTER_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `User business: ${business.name} (sells: ${(business.services || []).join(', ')})
User niche (competitors — NOT leads): ${analysis?.niche || 'unknown'}
Gap buyer niche: ${selectedGap?.niche}
Recommended target: ${selectedGap?.recommendedTarget}

Domain signals (lead must match): ${domainProfile.domainSignals.join(', ') || searchPlan.targetSummary}
Exclude signals: ${domainProfile.stringExcludes.slice(0, 12).join(', ')}

Candidates (return index numbers of valid BUYER leads only):
${JSON.stringify(entries, null, 2)}`,
        },
      ],
      maxTokens: 256,
    });

    const parsed = parseClaudeJson(content);
    const keep = Array.isArray(parsed?.keep)
      ? parsed.keep.filter((i) => Number.isInteger(i) && i >= 0 && i < keywordFiltered.length)
      : [];

    if (keep.length === 0) {
      onLog?.('No candidates matched the gap buyer niche after AI review');
      return [];
    }

    const filtered = keep.map((i) => keywordFiltered[i]);
    const removed = keywordFiltered.length - filtered.length;
    if (removed > 0) {
      onLog?.(`Removed ${removed} business${removed === 1 ? '' : 'es'} outside the gap buyer niche`);
    }
    return filtered;
  } catch (err) {
    console.warn(`[leadAgent] Lead niche filter failed: ${err.message}`);
    onLog?.('Lead niche filter unavailable — using keyword matching');
    return keywordFiltered;
  }
}

async function findLeadPlaces(business, searchPlan, domainProfile, competitors = [], onLog) {
  const location = business.location || 'local area';
  const seen = new Set();
  const collected = [];

  const anchor = await geocodeLocation(location);

  const searchPromises = searchPlan.searchQueries.map(async (query) => {
    try {
      const result = await searchPlaces(query, location, {
        anchor,
        pageSize: 20,
      });
      return { query, places: result.places || [] };
    } catch (err) {
      console.warn(`[leadAgent] Search failed for query "${query}": ${err.message}`);
      return { query, places: [] };
    }
  });

  const searchResults = await Promise.all(searchPromises);

  for (const { query, places } of searchResults) {
    for (const place of places) {
      if (collected.length >= MAX_CANDIDATES) break;
      if (isOwnBusiness(place, business)) continue;
      if (isCompetitorPlace(place, competitors)) continue;
      if (isExcludedPlace(place, domainProfile.stringExcludes)) continue;
      if (!matchesDomain(place, domainProfile)) {
        onLog?.(`Skipping outside gap niche: ${getPlaceNameLocal(place)}`);
        continue;
      }
      if (isKnownChain(getPlaceNameLocal(place))) continue;
      const id = place.id || getPlaceNameLocal(place);
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push(place);
    }
    if (collected.length >= MAX_CANDIDATES) break;
  }

  return collected;
}

function calculatePriorityScore(fit, budget, response) {
  return Math.round((fit * 0.3 + budget * 0.3 + response * 0.4) * 10) / 10;
}

async function buildLeadFromPlace(place, business, selectedGap, searchPlan, domainProfile) {
  const name = getPlaceNameLocal(place);
  const website = place.websiteUri || '';

  const [scraped, yelpData] = await Promise.all([
    website
      ? scrapeWebsite(website).catch((err) => {
          console.warn(`[leadAgent] Scrape failed for ${website}: ${err.message}`);
          return { content: '' };
        })
      : Promise.resolve({ content: '' }),
    getBusinessReviews(name, business.location).catch((err) => {
      console.warn(`[leadAgent] Yelp reviews failed for ${name}: ${err.message}`);
      return null;
    }),
  ]);

  const franchiseCheck = await isFranchise(name, scraped.content, place);
  if (franchiseCheck.franchise) {
    console.log(`[leadAgent] Skipping franchise/chain: ${name} (${franchiseCheck.reason})`);
    return null;
  }

  const scrapedPlace = {
    displayName: name,
    formattedAddress: place.formattedAddress || '',
    scrapedContent: scraped.content,
  };
  if (!matchesDomain(scrapedPlace, domainProfile, { strict: true })) {
    console.log(`[leadAgent] Skipping ${name} — scraped content doesn't match gap buyer niche`);
    return null;
  }
  const { content } = await callSonnet({
    system: LEAD_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `User business: ${JSON.stringify(business)}
Target gap: ${JSON.stringify(selectedGap)}
Lead search plan: ${JSON.stringify(searchPlan)}
Lead data: ${JSON.stringify({ place, scraped, yelpData })}`,
      },
    ],
  });

  const parsedLead = parseClaudeJson(content);
  const contactEmail = extractContactEmail(scraped.content);

  const googleRating = place.rating ?? null;
  const googleReviewCount = place.userRatingCount ?? null;
  const yelpRating = yelpData?.rating ?? null;
  const yelpReviewCount = yelpData?.reviewCount ?? null;

  const rating = googleRating ?? yelpRating;
  const reviewCount = googleReviewCount ?? yelpReviewCount;
  const reviewSource = googleReviewCount != null || googleRating != null
    ? 'google'
    : (yelpReviewCount != null || yelpRating != null ? 'yelp' : null);

  const recentReviews = (yelpData?.reviews || [])
    .slice(0, 2)
    .map((review) => ({
      text: review.text?.trim() || '',
      rating: review.rating ?? null,
      author: review.user?.name || 'Yelp user',
      source: 'yelp',
    }))
    .filter((review) => review.text);

  const lead = {
    name,
    address: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || '',
    website,
    email: contactEmail,
    lat: place.location?.latitude || null,
    lng: place.location?.longitude || null,
    rating,
    reviewCount,
    reviewSource,
    recentReviews,
    hook: parsedLead.hook,
    fitScore: parsedLead.fitScore,
    budgetScore: parsedLead.budgetScore,
    responseScore: parsedLead.responseScore,
  };
  lead.priorityScore = calculatePriorityScore(lead.fitScore, lead.budgetScore, lead.responseScore);
  return lead;
}

function sortLeadsByPriority(leads) {
  return [...leads].sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}

export async function* streamLeads(context) {
  if (!hasGooglePlaces) {
    throw new Error('Google Places API key is missing. Cannot search for leads without it.');
  }
  if (!hasAnthropic) {
    throw new Error('Anthropic API key is missing. Cannot analyze leads without it.');
  }

  const { business, analysis, competitors = [] } = context;
  const selectedGap = getSelectedGap(context);

  if (!business) throw new Error('Business profile required');
  if (!selectedGap) throw new Error('Market gap required — run Agent 4 first');

  yield { type: 'log', message: 'Starting lead generation...' };
  yield { type: 'log', message: `Target niche: "${selectedGap.niche}"` };
  yield { type: 'log', message: 'AI is planning lead search queries...' };

  const searchPlan = await planLeadSearch(business, selectedGap, analysis);
  const domainProfile = getLeadDomainProfile(business, selectedGap, analysis, searchPlan);
  console.log(`[leadAgent] Gap: "${selectedGap.niche}"`);
  console.log(`[leadAgent] Target: ${searchPlan.targetSummary}`);
  console.log(`[leadAgent] Domain signals: ${domainProfile.domainSignals.slice(0, 6).join(', ')}`);
  console.log(`[leadAgent] Queries: ${searchPlan.searchQueries.join(', ')}`);

  yield { type: 'log', message: `Target: ${searchPlan.targetSummary}` };
  if (domainProfile.domainSignals?.length) {
    yield { type: 'log', message: `Buyer signals: ${domainProfile.domainSignals.slice(0, 6).join(', ')}` };
  }
  yield { type: 'log', message: `Search queries: ${searchPlan.searchQueries.join(', ')}` };
  yield { type: 'log', message: `Searching Google Places near ${business.location || 'your area'}...` };

  const pendingSearchLogs = [];
  let candidates = await findLeadPlaces(
    business,
    searchPlan,
    domainProfile,
    competitors,
    (msg) => pendingSearchLogs.push(msg),
  );
  for (const msg of pendingSearchLogs) yield { type: 'log', message: msg };

  console.log(`[leadAgent] Found ${candidates.length} local candidates near ${business.location}`);

  yield { type: 'log', message: `Found ${candidates.length} candidate businesses` };

  if (candidates.length === 0) {
    throw new Error(`No local candidates found near ${business.location} matching queries: ${searchPlan.searchQueries.slice(0, 3).join(', ')}`);
  }

  yield { type: 'log', message: 'Checking candidates match the gap buyer niche...' };
  const filterLogs = [];
  candidates = await filterLeadCandidatesByNiche(
    candidates,
    business,
    selectedGap,
    analysis,
    searchPlan,
    domainProfile,
    (msg) => filterLogs.push(msg),
  );
  for (const msg of filterLogs) yield { type: 'log', message: msg };

  if (candidates.length === 0) {
    throw new Error(`No leads matched the gap buyer niche "${selectedGap.niche}" near ${business.location}. Try a different gap or update your location.`);
  }

  yield { type: 'log', message: `${candidates.length} candidates match the buyer niche` };
  yield { type: 'log', message: 'Qualifying leads (filtering franchises, scoring fit)...' };

  const leads = [];
  for (const place of candidates) {
    if (leads.length >= MAX_LEADS) break;

    const name = getPlaceNameLocal(place);
    try {
      yield { type: 'log', message: `Analyzing: ${name}...` };
      const lead = await buildLeadFromPlace(place, business, selectedGap, searchPlan, domainProfile);
      if (!lead) {
        yield { type: 'log', message: `Skipped: ${name} (filtered out)` };
        continue;
      }

      if (!meetsPriorityThreshold(lead)) {
        yield { type: 'log', message: `Skipped: ${name} (priority ${Number(lead.priorityScore).toFixed(1)} below ${MIN_PRIORITY_SCORE}.0)` };
        continue;
      }

      leads.push(lead);
      yield { type: 'log', message: `Qualified: ${name} (priority ${lead.priorityScore})` };
    } catch (err) {
      console.warn(`[leadAgent] Failed to process ${name}: ${err.message}`);
      yield { type: 'log', message: `Failed: ${name} — ${err.message}` };
    }
  }

  if (leads.length === 0) {
    throw new Error('All discovered candidates were filtered out (franchises/chains) or failed qualification analysis.');
  }

  const sortedLeads = sortLeadsByPriority(leads);
  yield { type: 'log', message: `Sorting ${sortedLeads.length} leads by priority (highest first)...` };
  yield {
    type: 'log',
    message: `Lead generation complete — ${sortedLeads.length} leads ready. Top: ${sortedLeads[0].name} (${sortedLeads[0].priorityScore})`,
  };
  yield { type: 'complete', leads: sortedLeads };
}

export async function leadAgent(context) {
  let leads = [];
  for await (const event of streamLeads(context)) {
    if (event.type === 'complete') leads = event.leads || [];
  }
  return { leads };
}
