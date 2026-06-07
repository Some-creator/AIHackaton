export const UNIVERSAL_VENUE_EXCLUDES = [
  'food truck park', 'truck park', 'food hall', 'food court', 'food park', 'market operator',
];

export const GENERIC_NOISE_EXCLUDES = ['print shop', 'shipping store', 'post office', 'gas station'];

export const LEAD_BASE_EXCLUDES = ['franchise', 'chain', 'corporate headquarters', 'gas station', 'grocery store'];

export function normalizeSignalList(values, max = 15) {
  return [...new Set(
    (values || [])
      .map((s) => String(s).trim().toLowerCase())
      .filter((s) => s.length > 1),
  )].slice(0, max);
}

export function getPlaceName(place) {
  return place.displayName?.text || place.displayName || place.name || 'Unknown';
}

export function getPlaceText(place) {
  return `${getPlaceName(place)} ${place.formattedAddress || place.address || ''} ${place.preScrapedContent || place.scrapedContent || ''}`.toLowerCase();
}

export function isExcludedPlace(place, excludeTypes) {
  const placeText = getPlaceText(place);
  return (excludeTypes || []).some((excluded) => {
    const term = String(excluded).toLowerCase().trim();
    if (term.length <= 2) return false;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(placeText);
  });
}

export function deriveSignalsFromSources({ nicheText = '', services = [], serviceLines = [], searchQueries = [], extraTexts = [] }) {
  const signals = new Set();

  for (const source of [nicheText, ...extraTexts].filter(Boolean)) {
    for (const part of String(source).toLowerCase().split(/[/,&|]+/)) {
      const trimmed = part.trim();
      if (trimmed.length > 2) signals.add(trimmed);
      for (const word of trimmed.split(/\s+/)) {
        if (word.length > 2) signals.add(word);
      }
    }
  }

  for (const s of [...services, ...serviceLines]) {
    const trimmed = String(s).trim().toLowerCase();
    if (trimmed.length > 2) signals.add(trimmed);
    for (const word of trimmed.split(/\s+/)) {
      if (word.length > 3) signals.add(word);
    }
  }

  for (const q of searchQueries) {
    const trimmed = String(q).trim().toLowerCase();
    if (trimmed.length > 2 && trimmed.length < 40) signals.add(trimmed);
  }

  return [...signals];
}

export function defaultExcludesForCategory(primaryCategory) {
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
  return GENERIC_NOISE_EXCLUDES;
}

export function placeMatchesDomainSignal(text, signals) {
  return signals.some((sig) => {
    if (sig.length <= 2) return false;
    const escaped = sig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) return true;
    return sig.length >= 4 && text.includes(sig);
  });
}

export function passesLeadExcludes(place, domainProfile) {
  return !isExcludedPlace(place, domainProfile.stringExcludes);
}

export function matchesDomain(place, domainProfile, { strict = false, mode = 'competitor' } = {}) {
  const text = getPlaceText(place);
  if (isExcludedPlace(place, domainProfile.stringExcludes)) return false;

  // Lead search queries already target buyers — only hard-exclude wrong types at collection.
  if (mode === 'lead' && !strict) return true;

  const signals = domainProfile.domainSignals || [];
  if (signals.length === 0) return true;

  const discoveryQuery = String(place.discoveryQuery || '').toLowerCase();
  if (discoveryQuery && placeMatchesDomainSignal(discoveryQuery, signals)) return true;

  if (placeMatchesDomainSignal(text, signals)) return true;

  const name = getPlaceName(place);
  const hasRichContent = (place.preScrapedContent || '').trim().length > 40
    || (place.scrapedContent || '').trim().length > 40;

  if (!strict && !hasRichContent && name.split(/\s+/).filter(Boolean).length <= 2) {
    return true;
  }

  return false;
}

export function buildDomainProfile({
  label,
  domainSignals,
  excludeSignals,
  extraExcludes = [],
  idPrefix = 'domain',
}) {
  const excludeList = normalizeSignalList([
    ...excludeSignals,
    ...extraExcludes,
  ]);
  const excludeSet = new Set(excludeList);
  const cleanSignals = normalizeSignalList(domainSignals).filter((s) => !excludeSet.has(s));

  return {
    id: `${idPrefix}-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}` || idPrefix,
    label,
    domainSignals: cleanSignals,
    stringExcludes: excludeList,
  };
}

export function getCompetitorDomainProfile(business, analysis, searchPlan, inferPrimaryCategory) {
  const primaryCategory = searchPlan?.primaryCategory || inferPrimaryCategory(business, analysis);

  const domainSignals = searchPlan?.domainSignals?.length
    ? searchPlan.domainSignals
    : deriveSignalsFromSources({
      nicheText: analysis?.niche || primaryCategory,
      services: business?.services,
      serviceLines: searchPlan?.serviceLines,
      searchQueries: searchPlan?.searchQueries,
    });

  const excludeSignals = [
    ...(searchPlan?.excludeSignals || []),
    ...(searchPlan?.excludeTypes || []),
    ...defaultExcludesForCategory(primaryCategory),
    ...UNIVERSAL_VENUE_EXCLUDES,
    ...GENERIC_NOISE_EXCLUDES,
  ];

  return buildDomainProfile({
    label: primaryCategory,
    domainSignals,
    excludeSignals,
    idPrefix: 'competitor',
  });
}

export function getLeadDomainProfile(business, selectedGap, analysis, searchPlan) {
  const label = selectedGap?.niche || searchPlan?.targetSummary || 'target buyers';

  const domainSignals = searchPlan?.domainSignals?.length
    ? searchPlan.domainSignals
    : deriveSignalsFromSources({
      nicheText: selectedGap?.recommendedTarget || selectedGap?.niche,
      extraTexts: [selectedGap?.demand, searchPlan?.targetSummary],
      searchQueries: searchPlan?.searchQueries,
    });

  const excludeSignals = [
    ...(searchPlan?.excludeSignals || []),
    ...(searchPlan?.excludeTypes || []),
    ...LEAD_BASE_EXCLUDES,
    ...UNIVERSAL_VENUE_EXCLUDES,
  ];

  return buildDomainProfile({
    label,
    domainSignals,
    excludeSignals,
    idPrefix: 'lead',
  });
}
