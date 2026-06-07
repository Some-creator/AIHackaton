import { geocodeLocation, parseLocationHints, searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import {
  extractBusinessNameFromTitle,
  isDirectoryOrAggregatorUrl,
  searchWeb,
} from '../backend/webSearch.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { hasGooglePlaces, hasAnthropic, hasFirecrawl } from '../backend/config.js';

const MAX_COMPETITORS = 5;
const MIN_COMPETITORS = 2;
const MAX_CANDIDATE_POOL = 15;

const COMPETITOR_FIELDS = ['name', 'website', 'strengths', 'weaknesses', 'targetMarket', 'theyHaveYouDont'];
const ARRAY_FIELDS = ['strengths', 'weaknesses', 'theyHaveYouDont'];

const SEARCH_PLAN_SYSTEM = `You plan competitor discovery searches for a local business. Results will be gathered from Google Places and web search.

Read the business profile (Agent 1) and consultant analysis (Agent 2). Infer what the business ACTUALLY does — including every distinct concept (e.g. a hookah lounge that also serves coffee is BOTH a hookah lounge and a café, not just "café" because the name contains cafe).

CRITICAL — competitors must be in the SAME niche/category as the user's business — not broad industry buckets:
- Match the user's exact product/service niche (café vs café, taco shop vs taqueria, dentist vs dentist, salon vs salon)
- Never use generic queries like "restaurant" or "food" unless the business is genuinely a general restaurant

CRITICAL — use business.type to decide WHO counts as a competitor:
- "mobile vendor": competitors are OTHER mobile/roving vendors (food trucks, catering trucks, mobile bars, mobile coffee carts, event vendors, pop-up operators). Search for mobile-specific terms. Do NOT search for brick-and-mortar restaurants, cafés, diners, or retail stores as competitors unless they explicitly operate a mobile unit.
- "fixed location": competitors are local brick-and-mortar businesses with a storefront or permanent address in the same category.
- "service provider": competitors are other businesses offering the same services (often office-based, home-based, or on-site service companies).

Return ONLY valid JSON:
{
  "businessSummary": "one sentence describing what this business really is",
  "primaryCategory": "exact niche label, e.g. coffee shop / café, taco restaurant, hair salon, mobile coffee cart, dental clinic",
  "serviceLines": ["string"],
  "domainSignals": ["5-12 words or short phrases that identify THIS niche in a competitor name or listing — e.g. coffee, café, espresso for a café; taco, taqueria, mexican for a taco shop; dental, dentist for a dental clinic"],
  "excludeSignals": ["5-12 adjacent categories that are NOT competitors — be aggressive"],
  "competitorScope": "mobile-only | fixed-only | mobile-and-fixed | service-area",
  "searchQueries": ["string"],
  "excludeTypes": ["string"],
  "comparisonNotes": "how to frame competitor comparisons across all service lines"
}

Rules for domainSignals:
- Terms a customer would use to find THIS exact type of business on Google Maps
- Include synonyms and common variants (café + cafe + coffee shop; taqueria + taco)
- For mobile vendors include both mobile terms AND fixed-location equivalents when competitorScope is mobile-and-fixed

Rules for excludeSignals:
- Every adjacent category a customer might confuse with this niche but is NOT a direct competitor
- Include venue operators that host vendors but don't sell the product (food truck park, food hall, food court)
- Include broad catch-all categories that cause bad matches (generic "restaurant" for a café, "salon" for a barbershop when user is barbershop-only)

Rules for competitorScope:
- "fixed-only": brick-and-mortar storefront competitors only (default for fixed location businesses)
- "mobile-only": other mobile/roving vendors only — no permanent storefronts
- "mobile-and-fixed": mobile vendor that also competes with brick-and-mortar in the same niche (e.g. coffee cart vs coffee shop, taco truck vs taqueria)
- "service-area": on-site or regional service businesses (plumbers, cleaners, consultants)

Rules for searchQueries:
- 5-8 plain-English queries a customer would type into Google Maps to find THIS EXACT type of business
- Use niche-specific terms (e.g. "coffee shop", "café", "espresso bar" for a café — NOT generic "restaurant" alone)
- Cover EVERY distinct service line with dedicated queries
- Use specific terms from services, target market, and analysis — not generic labels alone
- Short queries only (2-5 words); never include city, state, or country — location is applied separately
- Do not include the business's own name
- For mobile vendors: use queries for the SAME product domain — never generic terms that pull unrelated categories (e.g. "food truck park" for a café; use "mobile coffee cart" instead)

Rules for excludeTypes:
- Mirror excludeSignals — adjacent categories that should never appear as competitors
- 5-10 items, be aggressive`;

const NICHE_FILTER_SYSTEM = `You filter local business search results to keep ONLY direct competitors in the SAME domain/niche as the user's business.

Rules:
- Same domain means they sell the SAME core product/service — a customer would choose between them for the same need
- Use the domainSignals list: a keeper MUST clearly match at least one signal in name, listing, or snippet
- EXCLUDE anything matching excludeSignals — adjacent categories, venue operators, or indirect competitors
- EXCLUDE venue operators that host other vendors but don't sell the product themselves (food truck parks, food halls, food courts, market operators)
- EXCLUDE indirect or adjacent categories even if they appear in the same broad industry
- When unsure, EXCLUDE — quality over quantity. Returning an empty keep list is better than wrong competitors.

Return ONLY valid JSON: { "keep": [0, 2] } — array of candidate index integers to keep. Return { "keep": [] } if none are true same-domain competitors.`;

const BENCHMARK_SYSTEM = `You are a competitive analysis consultant. Compare local competitors directly to the user's business.

Rules:
- Base every point on the provided competitor data (Google listing + scraped website content)
- Do not invent services, pricing, or features not supported by the data
- All competitors are pre-filtered to the SAME niche/category as the user's business — treat them as true direct competitors
- Match competitor type using competitorScope from the SEARCH PLAN
- Use the SEARCH PLAN primaryCategory and service lines — compare within that niche only
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
  const placeText = getPlaceText(place);
  return (excludeTypes || []).some((excluded) => {
    const term = String(excluded).toLowerCase().trim();
    if (term.length <= 2) return false;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(placeText);
  });
}

function getPlaceText(place) {
  return `${getPlaceName(place)} ${place.formattedAddress || ''} ${place.preScrapedContent || ''}`.toLowerCase();
}

function businessContextText(business, analysis) {
  return [
    business.name,
    business.type,
    business.targetMarket,
    analysis?.niche,
    ...(business.services || []),
    ...(analysis?.strengths || []),
    ...(analysis?.missing || []),
  ].join(' ').toLowerCase();
}

function inferPrimaryCategory(business, analysis) {
  if (analysis?.niche?.trim()) {
    return analysis.niche.trim();
  }

  const text = businessContextText(business, analysis);

  if (/\b(coffee|espresso|cafe|café|latte|cappuccino|roaster|roastery|bakery|pastry|tea house)\b/.test(text)) {
    return 'coffee shop / café';
  }
  if (/\b(taco|taqueria|mexican|burrito|quesadilla)\b/.test(text)) {
    return 'mexican restaurant / taco shop';
  }
  if (/\b(pizza|pizzeria)\b/.test(text)) {
    return 'pizza restaurant';
  }
  if (/\b(burger|hamburger)\b/.test(text)) {
    return 'burger restaurant';
  }
  if (/\b(sushi|japanese|ramen)\b/.test(text)) {
    return 'japanese restaurant';
  }
  if (/\b(bbq|barbecue|smokehouse|brisket)\b/.test(text)) {
    return 'bbq restaurant';
  }
  if (/\b(hookah|shisha|lounge)\b/.test(text)) {
    return 'hookah lounge';
  }
  if (/\b(salon|barber|haircut|hairstyl)\b/.test(text)) {
    return 'hair salon / barbershop';
  }
  if (/\b(nail|manicure|pedicure)\b/.test(text)) {
    return 'nail salon';
  }
  if (isMobileVendor(business)) {
    return 'mobile food/beverage vendor';
  }
  if (business.type === 'fixed location') {
    return business.services?.[0] || 'local storefront business';
  }
  return business.type || 'local business';
}

const UNIVERSAL_VENUE_EXCLUDES = [
  'food truck park', 'truck park', 'food hall', 'food court', 'food park', 'market operator',
];

const GENERIC_NOISE_EXCLUDES = ['print shop', 'shipping store', 'post office', 'gas station'];

function normalizeSignalList(values, max = 15) {
  return [...new Set(
    (values || [])
      .map((s) => String(s).trim().toLowerCase())
      .filter((s) => s.length > 1),
  )].slice(0, max);
}

function deriveDomainSignalsFallback(business, analysis, searchPlan) {
  const signals = new Set();
  const niche = (analysis?.niche || searchPlan?.primaryCategory || inferPrimaryCategory(business, analysis)).toLowerCase();

  for (const part of niche.split(/[/,&|]+/)) {
    const trimmed = part.trim();
    if (trimmed.length > 2) signals.add(trimmed);
    for (const word of trimmed.split(/\s+/)) {
      if (word.length > 2) signals.add(word);
    }
  }

  for (const s of [...(business.services || []), ...(searchPlan?.serviceLines || [])]) {
    const trimmed = String(s).trim().toLowerCase();
    if (trimmed.length > 2) signals.add(trimmed);
    for (const word of trimmed.split(/\s+/)) {
      if (word.length > 3) signals.add(word);
    }
  }

  for (const q of searchPlan?.searchQueries || []) {
    const trimmed = String(q).trim().toLowerCase();
    if (trimmed.length > 2 && trimmed.length < 40) signals.add(trimmed);
  }

  return [...signals];
}

function defaultCompetitorScope(business) {
  if (isMobileVendor(business)) return 'mobile-and-fixed';
  if (String(business?.type || '').trim().toLowerCase() === 'service provider') return 'service-area';
  return 'fixed-only';
}

function getDomainProfile(business, analysis, searchPlan) {
  const primaryCategory = searchPlan?.primaryCategory || inferPrimaryCategory(business, analysis);
  const competitorScope = searchPlan?.competitorScope || defaultCompetitorScope(business);

  const domainSignals = normalizeSignalList(
    searchPlan?.domainSignals?.length
      ? searchPlan.domainSignals
      : deriveDomainSignalsFallback(business, analysis, searchPlan),
  );

  const excludeSignals = normalizeSignalList([
    ...(searchPlan?.excludeSignals || []),
    ...(searchPlan?.excludeTypes || []),
    ...defaultExcludesForCategory(primaryCategory),
    ...UNIVERSAL_VENUE_EXCLUDES,
    ...GENERIC_NOISE_EXCLUDES,
  ]);

  const excludeSet = new Set(excludeSignals);
  const cleanDomainSignals = domainSignals.filter((s) => !excludeSet.has(s));

  return {
    id: primaryCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'domain',
    label: primaryCategory,
    primaryCategory,
    competitorScope,
    domainSignals: cleanDomainSignals,
    stringExcludes: excludeSignals,
  };
}

function placeMatchesDomainSignal(text, signals) {
  return signals.some((sig) => {
    if (sig.length <= 2) return false;
    const escaped = sig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) return true;
    return sig.length >= 4 && text.includes(sig);
  });
}

function matchesDomain(place, domainProfile, { strict = false } = {}) {
  const text = getPlaceText(place);
  if (isExcludedPlace(place, domainProfile.stringExcludes)) return false;

  const signals = domainProfile.domainSignals || [];
  if (signals.length === 0) return true;

  if (placeMatchesDomainSignal(text, signals)) return true;

  const name = getPlaceName(place);
  const hasRichContent = (place.preScrapedContent || '').trim().length > 40
    || (place.scrapedContent || '').trim().length > 40;

  if (!strict && !hasRichContent && name.split(/\s+/).filter(Boolean).length <= 2) {
    return true;
  }

  return false;
}

function shouldSkipForCompetitorScope(place, business, domainProfile) {
  if (!isMobileVendor(business)) return false;
  if (domainProfile.competitorScope === 'mobile-and-fixed') return false;
  if (domainProfile.competitorScope === 'mobile-only') {
    return isFixedStorefrontOnly(place);
  }
  return isFixedStorefrontOnly(place);
}

function defaultExcludesForCategory(primaryCategory) {
  const cat = String(primaryCategory || '').toLowerCase();

  if (cat.includes('coffee') || cat.includes('café') || cat.includes('cafe') || cat.includes('bakery')) {
    return [
      'food truck park', 'truck park', 'food hall', 'food court', 'food park',
      'taco', 'taqueria', 'mexican', 'pizza', 'pizzeria', 'burger', 'sushi', 'bbq', 'barbecue',
      'steakhouse', 'fast food', 'bar', 'nightclub', 'pub', 'brewery', 'liquor',
      'birria', 'fried chicken', 'mediterranean',
    ];
  }
  if (cat.includes('taco') || cat.includes('mexican')) {
    return ['coffee shop', 'café', 'cafe', 'bakery', 'pizza', 'sushi', 'salon', 'barbershop'];
  }
  if (cat.includes('pizza')) {
    return ['taco', 'taqueria', 'coffee shop', 'café', 'cafe', 'sushi', 'burger', 'bbq'];
  }
  if (cat.includes('salon') || cat.includes('barber')) {
    return ['nail salon', 'spa', 'restaurant', 'cafe', 'taco', 'pizza', 'med spa', 'waxing'];
  }
  if (cat.includes('dental') || cat.includes('dentist')) {
    return ['veterinar', 'urgent care', 'hospital', 'pharmacy', 'salon', 'restaurant'];
  }
  if (cat.includes('law') || cat.includes('attorney') || cat.includes('legal')) {
    return ['accountant', 'tax preparer', 'insurance agency', 'real estate', 'restaurant'];
  }
  if (cat.includes('gym') || cat.includes('fitness') || cat.includes('yoga')) {
    return ['salon', 'spa', 'restaurant', 'physical therapy', 'chiropractor'];
  }
  if (cat.includes('plumb') || cat.includes('hvac') || cat.includes('electric')) {
    return ['general contractor', 'handyman', 'restaurant', 'retail store'];
  }
  return GENERIC_NOISE_EXCLUDES;
}

function buildCategorySearchQueries(business, primaryCategory, searchPlan) {
  const services = business.services?.filter(Boolean) || [];
  const fromPlan = (searchPlan?.searchQueries || []).filter(Boolean);

  if (fromPlan.length >= 3) return fromPlan.slice(0, 8);

  return [...new Set([
    primaryCategory,
    ...fromPlan,
    ...services.slice(0, 3),
  ].filter(Boolean))].slice(0, 8);
}

function keywordFilterCandidates(candidates, domainProfile) {
  return candidates.filter((place) => matchesDomain(place, domainProfile));
}

async function filterCandidatesByNiche(candidates, business, analysis, searchPlan, domainProfile, onLog) {
  const keywordFiltered = keywordFilterCandidates(candidates, domainProfile);
  if (keywordFiltered.length === 0) return [];

  if (!hasAnthropic) {
    return keywordFiltered.slice(0, MAX_COMPETITORS);
  }

  const entries = keywordFiltered.map((place, index) => ({
    index,
    name: getPlaceName(place),
    address: place.formattedAddress || '',
    website: place.websiteUri || '',
    snippet: (place.preScrapedContent || '').slice(0, 400),
  }));

  try {
    const { content } = await callSonnet({
      system: NICHE_FILTER_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `User business: ${business.name}
Domain: ${domainProfile.label}
Domain signals (competitor must match): ${domainProfile.domainSignals.join(', ') || 'see primary category'}
Exclude signals: ${domainProfile.stringExcludes.slice(0, 12).join(', ')}
Primary category: ${searchPlan.primaryCategory}
Business type: ${business.type}
Competitor scope: ${domainProfile.competitorScope}
Services: ${(business.services || []).join(', ') || 'unknown'}
Service lines: ${(searchPlan.serviceLines || []).join(', ')}

Agent 2 analysis:
${JSON.stringify(analysis, null, 2)}

Candidates (return index numbers of SAME-DOMAIN direct competitors only):
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
      onLog?.('No candidates matched your domain after AI review');
      return [];
    }

    const filtered = keep.map((i) => keywordFiltered[i]);
    const removed = keywordFiltered.length - filtered.length;
    if (removed > 0) {
      onLog?.(`Removed ${removed} business${removed === 1 ? '' : 'es'} outside your domain (${searchPlan.primaryCategory})`);
    }
    return filtered.slice(0, MAX_COMPETITORS);
  } catch (err) {
    console.warn(`[benchmarkAgent] Niche filter failed: ${err.message}`);
    onLog?.('Niche filter unavailable — using domain keyword matching');
    return keywordFiltered.slice(0, MAX_COMPETITORS);
  }
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

const MOBILE_VENDOR_EXCLUDES = [
  'print shop',
  'grocery store',
  'shipping store',
];

function isMobileVendor(business) {
  return String(business?.type || '').trim().toLowerCase() === 'mobile vendor';
}

function buildMobileDomainQueries(business, analysis, searchPlan) {
  const primaryCategory = searchPlan?.primaryCategory || inferPrimaryCategory(business, analysis);
  const services = business.services?.filter(Boolean) || [];
  const signals = normalizeSignalList(
    searchPlan?.domainSignals?.length
      ? searchPlan.domainSignals
      : deriveDomainSignalsFallback(business, analysis, searchPlan),
  ).slice(0, 5);

  const queries = new Set();

  for (const sig of signals) {
    queries.add(sig);
    queries.add(`mobile ${sig}`);
    queries.add(`${sig} truck`);
    queries.add(`${sig} cart`);
    queries.add(`${sig} catering`);
  }

  if (searchPlan?.competitorScope === 'mobile-and-fixed' || defaultCompetitorScope(business) === 'mobile-and-fixed') {
    for (const sig of signals.slice(0, 3)) {
      if (!/\bmobile\b/i.test(sig)) queries.add(sig);
    }
  }

  queries.add(primaryCategory);

  for (const s of services.slice(0, 3)) {
    const term = s.split(/\s+/).slice(0, 2).join(' ');
    if (term) {
      queries.add(`mobile ${term}`);
      queries.add(`${term} catering`);
    }
  }

  for (const q of searchPlan?.searchQueries || []) {
    queries.add(String(q).trim());
  }

  return [...queries].filter(Boolean).slice(0, 8);
}

function isFixedStorefrontOnly(place) {
  const text = `${getPlaceName(place)} ${place.formattedAddress || ''}`;
  return FIXED_STOREFRONT_SIGNALS.test(text) && !MOBILE_VENDOR_SIGNALS.test(text);
}

function fallbackSearchPlan(business, analysis) {
  const services = business.services?.filter(Boolean) || [];
  const mobile = isMobileVendor(business);
  const primaryCategory = inferPrimaryCategory(business, analysis);
  const categoryExcludes = defaultExcludesForCategory(primaryCategory);
  const competitorScope = defaultCompetitorScope(business);
  const domainSignals = deriveDomainSignalsFallback(business, analysis, { primaryCategory, serviceLines: services });

  const base = {
    primaryCategory,
    serviceLines: services.length ? services.slice(0, 4) : [primaryCategory],
    domainSignals: domainSignals.slice(0, 12),
    excludeSignals: categoryExcludes,
    competitorScope,
    excludeTypes: categoryExcludes,
  };

  if (mobile) {
    return {
      ...base,
      businessSummary: `${business.name} — mobile ${primaryCategory}`,
      searchQueries: buildMobileDomainQueries(business, analysis, base),
      comparisonNotes: `Compare other businesses in the same niche (${primaryCategory}) — mobile vendors${competitorScope === 'mobile-and-fixed' ? ' and brick-and-mortar peers' : ''} only.`,
    };
  }

  return {
    ...base,
    businessSummary: `${business.name} — ${primaryCategory}`,
    searchQueries: buildCategorySearchQueries(business, primaryCategory, base),
    comparisonNotes: `Compare other ${primaryCategory} businesses in the same niche — not adjacent categories.`,
  };
}

function applyBusinessTypeSearchRules(plan, business, analysis) {
  const competitorScope = plan.competitorScope || defaultCompetitorScope(business);
  const domainSignals = normalizeSignalList(
    plan.domainSignals?.length
      ? plan.domainSignals
      : deriveDomainSignalsFallback(business, analysis, plan),
  );
  const mergedExcludes = [...new Set([
    ...UNIVERSAL_VENUE_EXCLUDES,
    ...(plan.excludeSignals || []),
    ...(plan.excludeTypes || []),
    ...defaultExcludesForCategory(plan.primaryCategory),
    ...(competitorScope === 'mobile-only' ? MOBILE_VENDOR_EXCLUDES : []),
  ])];

  if (!isMobileVendor(business)) {
    return {
      ...plan,
      competitorScope,
      domainSignals,
      excludeSignals: mergedExcludes,
      excludeTypes: mergedExcludes,
    };
  }

  const searchQueries = [...new Set([
    ...buildMobileDomainQueries(business, analysis, plan),
    ...(plan.searchQueries || []),
  ])].slice(0, 8);

  return {
    ...plan,
    competitorScope,
    searchQueries,
    excludeSignals: mergedExcludes,
    excludeTypes: mergedExcludes,
    domainSignals,
    comparisonNotes: plan.comparisonNotes || `Compare other ${plan.primaryCategory} businesses in the same niche.`,
  };
}

function normalizeSearchPlan(raw, business, analysis) {
  const fallback = fallbackSearchPlan(business, analysis);
  const plan = raw && typeof raw === 'object' ? raw : {};

  const searchQueries = (Array.isArray(plan.searchQueries) ? plan.searchQueries : [])
    .map((q) => String(q).trim())
    .filter(Boolean)
    .filter((q) => !/\brestaurant\b/i.test(q) || /\b(cafe|café|coffee|taco|pizza|sushi|bbq|mexican|burger|dental|salon|barber)\b/i.test(q))
    .slice(0, 8);

  const serviceLines = (Array.isArray(plan.serviceLines) ? plan.serviceLines : [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  const domainSignals = normalizeSignalList(
    Array.isArray(plan.domainSignals) && plan.domainSignals.length
      ? plan.domainSignals
      : fallback.domainSignals,
  );

  const excludeSignals = normalizeSignalList([
    ...(Array.isArray(plan.excludeSignals) ? plan.excludeSignals : []),
    ...(Array.isArray(plan.excludeTypes) ? plan.excludeTypes : []),
    ...fallback.excludeTypes,
  ]);

  const competitorScope = ['mobile-only', 'fixed-only', 'mobile-and-fixed', 'service-area'].includes(plan.competitorScope)
    ? plan.competitorScope
    : fallback.competitorScope;

  const primaryCategory = String(plan.primaryCategory || fallback.primaryCategory).trim();

  const normalized = {
    businessSummary: String(plan.businessSummary || fallback.businessSummary).trim(),
    primaryCategory,
    serviceLines: serviceLines.length ? serviceLines : fallback.serviceLines,
    domainSignals,
    excludeSignals,
    competitorScope,
    searchQueries: searchQueries.length ? searchQueries : fallback.searchQueries,
    excludeTypes: excludeSignals,
    comparisonNotes: String(plan.comparisonNotes || fallback.comparisonNotes).trim(),
  };

  return applyBusinessTypeSearchRules(normalized, business, analysis);
}

async function planCompetitorSearch(business, analysis) {
  if (!hasAnthropic) {
    return fallbackSearchPlan(business, analysis);
  }

  try {
    const { content } = await callSonnet({
      system: SEARCH_PLAN_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Plan competitor searches for this business.

Business type: ${business.type || 'unknown'}
${isMobileVendor(business)
  ? 'This is a MOBILE VENDOR — set competitorScope to mobile-and-fixed if they also compete with brick-and-mortar in the same niche (e.g. coffee cart vs coffee shop). Use domain-specific mobile queries, NOT generic "food truck" unless the business is a food truck.'
  : business.type === 'fixed location'
    ? 'This is a FIXED LOCATION business — set competitorScope to fixed-only. Find brick-and-mortar competitors in the EXACT SAME niche.'
    : 'This is a SERVICE PROVIDER — set competitorScope to service-area. Find businesses offering the same services.'}

You MUST set domainSignals (what identifies a true competitor) and excludeSignals (adjacent categories to reject) for THIS specific niche — not generic food/restaurant terms unless relevant.

Set primaryCategory to the precise niche (e.g. "coffee shop / café", "dental clinic", "hair salon" — not just "restaurant" or "business").

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

function addCompetitorCandidate(collected, seen, place, business, searchPlan, domainProfile, onLog, maxPool = MAX_CANDIDATE_POOL) {
  if (collected.length >= maxPool) return false;
  if (isOwnBusiness(place, business)) return false;

  if (shouldSkipForCompetitorScope(place, business, domainProfile)) {
    onLog?.(`Skipping non-mobile competitor: ${getPlaceName(place)}`);
    return false;
  }
  if (!matchesDomain(place, domainProfile)) {
    onLog?.(`Skipping outside your domain: ${getPlaceName(place)}`);
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
  domainProfile,
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

  const searchPromises = queries.map(async (query, i) => {
    if (i > 0 || relaxed) {
      onLog?.(`${label}: "${query}"...`);
    }
    try {
      const result = await searchPlaces(query, location, {
        anchor,
        relaxed,
        onSkip: ({ name, address, reason }) => {
          onLog?.(`Skipping distant result: ${name}${address ? ` (${address})` : ''} — ${reason}`);
        },
      });
      return { query, result };
    } catch (err) {
      console.warn(`[benchmarkAgent] Google Places search failed for "${query}": ${err.message}`);
      onLog?.(`Places search failed for "${query}" — continuing`);
      return { query, result: { places: [], rawCount: 0 } };
    }
  });

  const searchResults = await Promise.all(searchPromises);

  for (const { query, result } of searchResults) {
    if (collected.length >= MAX_CANDIDATE_POOL) break;

    const { places, rawCount } = result;

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
        domainProfile,
        onLog
      )) {
        added += 1;
        onLog?.(`Found: ${getPlaceName(place)}`);
      }
    }
  }

  return added;
}

async function findCompetitorCandidates(business, analysis, searchPlan, onLog) {
  const location = business.location || 'local area';
  const queries = searchPlan.searchQueries;
  const domainProfile = getDomainProfile(business, analysis, searchPlan);
  const seen = new Set();
  const collected = [];
  const locationHints = parseLocationHints(location);

  onLog?.(`AI summary: ${searchPlan.businessSummary}`);
  onLog?.(`Niche: ${searchPlan.primaryCategory}`);
  if (domainProfile.domainSignals?.length) {
    onLog?.(`Domain signals: ${domainProfile.domainSignals.slice(0, 6).join(', ')}`);
  }
  onLog?.(`Service lines: ${searchPlan.serviceLines.join(', ')}`);
  onLog?.(`Search queries: ${queries.slice(0, 5).join(', ')}`);
  if (searchPlan.excludeTypes?.length) {
    onLog?.(`Excluding: ${searchPlan.excludeTypes.slice(0, 6).join(', ')}`);
  }

  if (location === 'Unknown' || location === 'local area') {
    onLog?.('Warning: business location is vague — competitor search works best with a city/state');
  }

  const anchor = await geocodeLocation(location);
  if (anchor) {
    onLog?.(`Anchoring search to ${location}`);
  } else {
    onLog?.(`Could not geocode ${location} — using text-based local search`);
  }

  // Strict local search first — tighter category match
  await searchGooglePlacesForCandidates({
    business,
    searchPlan,
    domainProfile,
    queries,
    location,
    anchor,
    collected,
    seen,
    onLog,
    relaxed: false,
  });

  if (collected.length < MIN_COMPETITORS) {
    await searchGooglePlacesForCandidates({
      business,
      searchPlan,
      domainProfile,
      queries,
      location,
      anchor,
      collected,
      seen,
      onLog,
      relaxed: true,
    });
  }

  if (hasFirecrawl) {
    onLog?.('Searching the web for local competitors...');
    const webPromises = queries.map(async (query) => {
      try {
        const { results } = await searchWeb(query, { location, limit: 8, scrape: false });
        if (!results.length) {
          onLog?.(`Web search returned no business sites for "${query}"`);
        }
        return { query, results };
      } catch (err) {
        console.warn(`[benchmarkAgent] Web search failed for "${query}": ${err.message}`);
        onLog?.(`Web search failed for "${query}" — continuing`);
        return { query, results: [] };
      }
    });

    const webResults = await Promise.all(webPromises);

    for (const { results } of webResults) {
      if (collected.length >= MAX_CANDIDATE_POOL) break;

      for (const result of results) {
        if (collected.length >= MAX_CANDIDATE_POOL) break;
        if (isDirectoryOrAggregatorUrl(result.url)) continue;
        if (!webResultMatchesRegion(result, locationHints)) {
          onLog?.(`Skipping web result outside region: ${result.title}`);
          continue;
        }

        const candidate = webResultToCandidate(result);
        if (addCompetitorCandidate(collected, seen, candidate, business, searchPlan, domainProfile, onLog)) {
          onLog?.(`Web result: ${getPlaceName(candidate)}`);
        }
      }
    }
  }

  if (collected.length === 0) {
    onLog?.('No competitors passed filters — check location, API keys, or search queries');
    return { filtered: [], query: queries[0] || 'local business' };
  }

  onLog?.('Checking competitors match your niche...');
  const filtered = await filterCandidatesByNiche(collected, business, analysis, searchPlan, domainProfile, onLog);

  if (filtered.length === 0) {
    onLog?.('No same-niche competitors found after filtering');
  }

  return { filtered, query: queries[0] || 'local business' };
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

function validateScrapedCompetitors(competitorData, domainProfile, onLog) {
  if (!domainProfile.domainSignals?.length) return competitorData;

  return competitorData.filter((comp) => {
    const place = {
      displayName: comp.name,
      formattedAddress: comp.address,
      preScrapedContent: comp.scrapedContent,
      scrapedContent: comp.scrapedContent,
    };
    if (matchesDomain(place, domainProfile, { strict: true })) return true;
    onLog?.(`Removing ${comp.name} — doesn't match ${domainProfile.label}`);
    return false;
  });
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
  yield { type: 'log', message: `Using business analysis (${analysis.strengths?.length || 0} strengths, ${analysis.missing?.length || 0} gaps identified)` };

  yield { type: 'log', message: 'AI is determining what competitors to search for...' };
  const searchPlan = await planCompetitorSearch(business, analysis);
  yield { type: 'log', message: `Identified: ${searchPlan.businessSummary}` };
  yield { type: 'log', message: `Niche: ${searchPlan.primaryCategory}` };
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
    const { filtered, query } = await findCompetitorCandidates(business, analysis, searchPlan, (msg) => pendingSearchLogs.push(msg));
    for (const msg of pendingSearchLogs) {
      yield { type: 'log', message: msg };
    }

    if (filtered.length === 0) {
      yield {
        type: 'error',
        error: `No ${searchPlan.primaryCategory} competitors found near ${business.location}. Try updating your services or location in your profile.`,
      };
      return;
    }

    yield {
      type: 'log',
      message: `Found ${filtered.length} business${filtered.length > 1 ? 'es' : ''} (first query: "${query}")`,
    };

    const pendingLogs = [];
    const domainProfile = getDomainProfile(business, analysis, searchPlan);
    let competitorData = await scrapeCompetitorsInParallel(filtered, (msg) => pendingLogs.push(msg));
    competitorData = validateScrapedCompetitors(competitorData, domainProfile, (msg) => pendingLogs.push(msg));
    for (const msg of pendingLogs) yield { type: 'log', message: msg };

    if (competitorData.length < MIN_COMPETITORS) {
      yield {
        type: 'error',
        error: `Only ${competitorData.length} competitor${competitorData.length === 1 ? '' : 's'} matched your domain after review. Need at least ${MIN_COMPETITORS} same-niche businesses near ${business.location}.`,
      };
      return;
    }

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
