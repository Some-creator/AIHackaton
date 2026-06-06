const US_STATE_BY_ABBREV = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

const US_ABBREV_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_BY_ABBREV).map(([abbrev, name]) => [name.toLowerCase(), abbrev])
);

const ADDRESS_PATTERN = /\b([A-Za-z][A-Za-z\s.'-]{1,40}),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?\b/g;
const CITY_STATE_PATTERN = /\b([A-Za-z][A-Za-z\s.'-]{1,40}),\s*([A-Z]{2})\b/g;
const ZIP_PATTERN = /\b(\d{5})(?:-\d{4})?\b/g;

function cleanCity(city) {
  return String(city || '')
    .replace(/\s+/g, ' ')
    .replace(/^(suite|ste|unit|#)\s*.+$/i, '')
    .trim();
}

export function normalizeState(state) {
  const raw = String(state || '').trim();
  if (!raw) return null;

  if (/^[A-Z]{2}$/i.test(raw) && US_STATE_BY_ABBREV[raw.toUpperCase()]) {
    return raw.toUpperCase();
  }

  const fromName = US_ABBREV_BY_NAME[raw.toLowerCase()];
  return fromName || null;
}

export function normalizeZipCode(zip) {
  const match = String(zip || '').match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

export function formatLocation({ city, state, zipCode } = {}) {
  const normalizedCity = cleanCity(city);
  const normalizedState = normalizeState(state);
  const normalizedZip = normalizeZipCode(zipCode);

  if (!normalizedCity || !normalizedState) {
    return normalizedCity || 'Unknown';
  }

  return normalizedZip
    ? `${normalizedCity}, ${normalizedState} ${normalizedZip}`
    : `${normalizedCity}, ${normalizedState}`;
}

export function isLocationComplete({ city, state } = {}) {
  return Boolean(cleanCity(city) && normalizeState(state));
}

export function extractAddressCandidates(text) {
  const content = String(text || '');
  const seen = new Set();
  const candidates = [];

  const addCandidate = (city, state, zipCode, source) => {
    const normalizedState = normalizeState(state);
    const normalizedCity = cleanCity(city);
    const normalizedZip = normalizeZipCode(zipCode);
    if (!normalizedCity || !normalizedState) return;

    const key = `${normalizedCity}|${normalizedState}|${normalizedZip || ''}`;
    if (seen.has(key)) return;
    seen.add(key);

    candidates.push({
      city: normalizedCity,
      state: normalizedState,
      zipCode: normalizedZip,
      source,
      location: formatLocation({
        city: normalizedCity,
        state: normalizedState,
        zipCode: normalizedZip,
      }),
    });
  };

  for (const match of content.matchAll(ADDRESS_PATTERN)) {
    addCandidate(match[1], match[2], match[3], 'address-regex');
  }

  for (const match of content.matchAll(CITY_STATE_PATTERN)) {
    addCandidate(match[1], match[2], null, 'city-state-regex');
  }

  return candidates;
}

export function parseLocationString(location) {
  const text = String(location || '').trim();
  if (!text || text === 'Unknown' || text === 'local area') {
    return { city: null, state: null, zipCode: null };
  }

  const withZip = text.match(/^(.+?),\s*([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?$/);
  if (withZip) {
    return {
      city: cleanCity(withZip[1]),
      state: normalizeState(withZip[2]),
      zipCode: normalizeZipCode(withZip[3]),
    };
  }

  const cityState = text.match(/^(.+?),\s*([A-Za-z]{2})$/);
  if (cityState) {
    return {
      city: cleanCity(cityState[1]),
      state: normalizeState(cityState[2]),
      zipCode: null,
    };
  }

  const trailingState = text.match(/^(.+?)\s+([A-Z]{2})$/);
  if (trailingState && normalizeState(trailingState[2])) {
    return {
      city: cleanCity(trailingState[1]),
      state: normalizeState(trailingState[2]),
      zipCode: null,
    };
  }

  return { city: cleanCity(text), state: null, zipCode: null };
}

export function mergeLocationFields(extracted = {}, candidates = []) {
  const fromString = parseLocationString(extracted.location);
  const bestCandidate = candidates[0];

  const city = cleanCity(extracted.city) || fromString.city || bestCandidate?.city || null;
  const state = normalizeState(extracted.state) || fromString.state || bestCandidate?.state || null;
  const zipCode = normalizeZipCode(extracted.zipCode) || fromString.zipCode || bestCandidate?.zipCode || null;

  return { city, state, zipCode };
}

export function evaluateLocationReadiness({ city, state, zipCode, confidence }) {
  const complete = isLocationComplete({ city, state });
  const normalizedConfidence = String(confidence || '').toLowerCase();

  if (!complete) {
    return {
      locationNeedsInput: true,
      locationConfidence: 'unknown',
      locationMessage: 'Add your city and state so competitor and lead search stay in the right area.',
    };
  }

  if (normalizedConfidence === 'low' || normalizedConfidence === 'unknown') {
    return {
      locationNeedsInput: true,
      locationConfidence: normalizedConfidence || 'low',
      locationMessage: 'We found a possible location but could not confirm it. Please verify your city, state, and ZIP.',
    };
  }

  if (!zipCode) {
    return {
      locationNeedsInput: false,
      locationConfidence: normalizedConfidence || 'medium',
      locationMessage: null,
    };
  }

  return {
    locationNeedsInput: false,
    locationConfidence: normalizedConfidence || 'high',
    locationMessage: null,
  };
}

export function buildBusinessLocationFields(rawBusiness = {}, addressCandidates = []) {
  const merged = mergeLocationFields(rawBusiness, addressCandidates);
  const readiness = evaluateLocationReadiness({
    city: merged.city,
    state: merged.state,
    zipCode: merged.zipCode,
    confidence: rawBusiness.locationConfidence,
  });

  return {
    city: merged.city,
    state: merged.state,
    zipCode: merged.zipCode,
    location: isLocationComplete(merged)
      ? formatLocation(merged)
      : (rawBusiness.location?.trim() || 'Unknown'),
    locationNeedsInput: readiness.locationNeedsInput,
    locationConfidence: readiness.locationConfidence,
    locationMessage: readiness.locationMessage,
  };
}

export function applyUserLocationUpdate(business = {}) {
  const city = cleanCity(business.city);
  const state = normalizeState(business.state);
  const zipCode = normalizeZipCode(business.zipCode);
  const complete = isLocationComplete({ city, state });

  return {
    ...business,
    city,
    state,
    zipCode,
    location: complete ? formatLocation({ city, state, zipCode }) : (business.location || 'Unknown'),
    locationNeedsInput: !complete,
    locationConfidence: complete ? 'high' : 'unknown',
    locationMessage: complete
      ? null
      : 'Add your city and state so competitor and lead search stay in the right area.',
  };
}

export function geocodeMatchesLocation(formattedAddress, { city, state, zipCode }) {
  const address = String(formattedAddress || '').toLowerCase();
  if (!address) return false;

  const normalizedState = normalizeState(state);
  const normalizedCity = cleanCity(city)?.toLowerCase();
  const normalizedZip = normalizeZipCode(zipCode);

  if (normalizedZip && !address.includes(normalizedZip)) {
    return false;
  }

  if (normalizedState) {
    const statePattern = new RegExp(`,\\s*${normalizedState.toLowerCase()}\\b`);
    if (!statePattern.test(address)) return false;
  }

  if (normalizedCity && !address.includes(normalizedCity)) {
    return false;
  }

  return true;
}
