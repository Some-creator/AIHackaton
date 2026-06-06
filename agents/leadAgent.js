import { geocodeLocation, searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { getBusinessReviews } from '../backend/yelp.js';
import { callSonnet, callHaiku } from '../backend/anthropic.js';
import { hasAnthropic, hasGooglePlaces } from '../backend/config.js';
import { parseClaudeJson } from '../backend/parseJson.js';

const MAX_LEADS = 8;
const MAX_CANDIDATES = 24;

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

The gap describes an underserved niche. Your queries must find PROSPECT CUSTOMERS (buyers who need the user's services), NOT:
- The user's own business
- Competitors of the user
- Franchises, chains, or corporate multi-location brands

Return ONLY valid JSON:
{
  "targetSummary": "one sentence describing the ideal independent lead",
  "searchQueries": ["string"],
  "excludeTypes": ["string"],
  "qualificationNotes": "how to tell a good independent lead from a bad one"
}

Rules for searchQueries:
- 5-8 short Google Maps queries (2-5 words each)
- Derived from gap niche, recommendedTarget, and demand — find businesses that NEED what the user sells
- Use concrete buyer types: "family owned restaurant", "neighborhood cafe", "independent print shop"
- Never include city, state, zip, or country — location is applied separately
- Never query the user's own business name or their direct competitors

Rules for excludeTypes:
- 4-8 business types that are NOT valid leads (chains, franchises, wrong industry)`;

const FRANCHISE_CLASSIFY_SYSTEM = `You classify whether a business is a franchise, national chain, or corporate multi-location brand.

Reply with ONLY "yes" or "no".

yes = national/regional chain, franchise, corporate-owned multi-location brand (McDonald's, Starbucks, 7-Eleven, Planet Fitness, hotel chains, gas station chains, etc.)
no = single independent local business, family-owned shop, one-off restaurant, or local operator even if the name sounds branded`;

const LEAD_SYSTEM = `You are a lead qualification agent. Score a LOCAL INDEPENDENT business that matches the target market gap.

The lead must be a plausible buyer for the user's business — not a franchise and not a competitor.

Generate:
1. hook — the specific real reason the user should reach out right now (tie to gap niche + listing/reviews)
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

function fallbackLeadSearchPlan(business, selectedGap) {
  const target = selectedGap?.recommendedTarget || selectedGap?.niche || '';
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
    'independent local business',
  ].filter((q) => q && q.split(' ').length <= 5))].slice(0, 6);

  return {
    targetSummary: firstPhrase || 'Local independent businesses matching the gap',
    searchQueries: queries.length ? queries : ['local business'],
    excludeTypes: ['franchise', 'chain', 'corporate office', 'gas station', 'grocery store'],
    qualificationNotes: 'Prefer independent operators with local addresses and no franchise website language.',
  };
}

function normalizeSearchPlan(raw, business, selectedGap) {
  const fallback = fallbackLeadSearchPlan(business, selectedGap);
  const plan = raw && typeof raw === 'object' ? raw : {};

  const searchQueries = (Array.isArray(plan.searchQueries) ? plan.searchQueries : [])
    .map((q) => String(q).trim())
    .filter(Boolean)
    .slice(0, 8);

  const excludeTypes = (Array.isArray(plan.excludeTypes) ? plan.excludeTypes : [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  return {
    targetSummary: String(plan.targetSummary || fallback.targetSummary).trim(),
    searchQueries: searchQueries.length ? searchQueries : fallback.searchQueries,
    excludeTypes: excludeTypes.length ? excludeTypes : fallback.excludeTypes,
    qualificationNotes: String(plan.qualificationNotes || fallback.qualificationNotes).trim(),
  };
}

async function planLeadSearch(business, selectedGap, analysis) {
  if (!hasAnthropic) {
    return fallbackLeadSearchPlan(business, selectedGap);
  }

  try {
    const { content } = await callHaiku({
      system: LEAD_SEARCH_PLAN_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Plan lead searches for this market gap.

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

    return normalizeSearchPlan(parseClaudeJson(content), business, selectedGap);
  } catch (err) {
    console.warn(`[leadAgent] Lead search plan failed: ${err.message}`);
    return fallbackLeadSearchPlan(business, selectedGap);
  }
}

function getPlaceName(place) {
  return place.displayName?.text || place.displayName || 'Unknown';
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

function isKnownChain(name) {
  const lower = String(name || '').toLowerCase();
  return KNOWN_CHAINS.some((chain) => lower.includes(chain));
}

function isExcludedPlace(place, excludeTypes) {
  const placeText = `${getPlaceName(place)} ${place.formattedAddress || ''}`.toLowerCase();
  return (excludeTypes || []).some((excluded) => {
    const term = String(excluded).toLowerCase().trim();
    return term.length > 2 && placeText.includes(term);
  });
}

function isCompetitorPlace(place, competitors = []) {
  const placeName = normalizeName(getPlaceName(place));
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

async function findLeadPlaces(business, searchPlan, competitors = []) {
  const location = business.location || 'local area';
  const seen = new Set();
  const collected = [];

  const anchor = await geocodeLocation(location);

  for (const query of searchPlan.searchQueries) {
    if (collected.length >= MAX_CANDIDATES) break;

    const { places } = await searchPlaces(query, location, {
      anchor,
      pageSize: 20,
    });

    for (const place of places || []) {
      if (collected.length >= MAX_CANDIDATES) break;
      if (isOwnBusiness(place, business)) continue;
      if (isCompetitorPlace(place, competitors)) continue;
      if (isExcludedPlace(place, searchPlan.excludeTypes)) continue;
      if (isKnownChain(getPlaceName(place))) continue;

      const id = place.id || getPlaceName(place);
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push(place);
    }
  }

  return collected;
}

function calculatePriorityScore(fit, budget, response) {
  return Math.round((fit * 0.3 + budget * 0.3 + response * 0.4) * 10) / 10;
}

async function buildLeadFromPlace(place, business, selectedGap, searchPlan) {
  const name = getPlaceName(place);
  const website = place.websiteUri || '';

  const [scraped, yelpData] = await Promise.all([
    website ? scrapeWebsite(website) : Promise.resolve({ content: '' }),
    getBusinessReviews(name, business.location),
  ]);

  const franchiseCheck = await isFranchise(name, scraped.content, place);
  if (franchiseCheck.franchise) {
    console.log(`[leadAgent] Skipping franchise/chain: ${name} (${franchiseCheck.reason})`);
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
  const lead = {
    name,
    address: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || '',
    website,
    email: contactEmail,
    lat: place.location?.latitude || null,
    lng: place.location?.longitude || null,
    hook: parsedLead.hook,
    fitScore: parsedLead.fitScore,
    budgetScore: parsedLead.budgetScore,
    responseScore: parsedLead.responseScore,
  };
  lead.priorityScore = calculatePriorityScore(lead.fitScore, lead.budgetScore, lead.responseScore);
  return lead;
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

  const searchPlan = await planLeadSearch(business, selectedGap, analysis);
  console.log(`[leadAgent] Gap: "${selectedGap.niche}"`);
  console.log(`[leadAgent] Target: ${searchPlan.targetSummary}`);
  console.log(`[leadAgent] Queries: ${searchPlan.searchQueries.join(', ')}`);

  const candidates = await findLeadPlaces(business, searchPlan, competitors);
  console.log(`[leadAgent] Found ${candidates.length} local candidates near ${business.location}`);

  if (candidates.length === 0) {
    throw new Error(`No local candidates found near ${business.location} matching queries: ${searchPlan.searchQueries.slice(0, 3).join(', ')}`);
  }

  let leadCount = 0;
  for (const place of candidates) {
    if (leadCount >= MAX_LEADS) break;

    try {
      const lead = await buildLeadFromPlace(place, business, selectedGap, searchPlan);
      if (!lead) continue;

      leadCount += 1;
      yield lead;
    } catch (err) {
      console.warn(`[leadAgent] Failed to process ${getPlaceName(place)}: ${err.message}`);
    }
  }

  if (leadCount === 0) {
    throw new Error('All discovered candidates were filtered out (franchises/chains) or failed qualification analysis.');
  }
}

export async function leadAgent(context) {
  const leads = [];
  for await (const lead of streamLeads(context)) {
    leads.push(lead);
  }
  return { leads: leads.sort((a, b) => b.priorityScore - a.priorityScore) };
}
