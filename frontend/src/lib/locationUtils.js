const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'],
  ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'],
  ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'],
  ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'],
  ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
  ['DC', 'District of Columbia'],
];

export const US_STATE_OPTIONS = US_STATES;

function cleanCity(city) {
  return String(city || '').replace(/\s+/g, ' ').trim();
}

export function normalizeState(state) {
  const raw = String(state || '').trim().toUpperCase();
  if (!raw) return '';
  return US_STATES.some(([abbrev]) => abbrev === raw) ? raw : '';
}

export function sanitizeZipInput(zip) {
  return String(zip || '').replace(/\D/g, '').slice(0, 5);
}

export function normalizeZipCode(zip) {
  const digits = sanitizeZipInput(zip);
  return digits.length === 5 ? digits : '';
}

export function formatLocation({ city, state, zipCode } = {}) {
  const normalizedCity = cleanCity(city);
  const normalizedState = normalizeState(state);
  const normalizedZip = normalizeZipCode(zipCode);

  if (!normalizedCity || !normalizedState) return '';

  return normalizedZip
    ? `${normalizedCity}, ${normalizedState} ${normalizedZip}`
    : `${normalizedCity}, ${normalizedState}`;
}

export function isLocationComplete({ city, state } = {}) {
  return Boolean(cleanCity(city) && normalizeState(state));
}

export function applyUserLocationUpdate(business = {}) {
  const city = cleanCity(business.city);
  const state = normalizeState(business.state);
  const zipCode = sanitizeZipInput(business.zipCode);
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

export function initialProfileFromBusiness(business = {}) {
  return applyUserLocationUpdate({
    ...business,
    city: business.city || '',
    state: business.state || '',
    zipCode: business.zipCode || '',
  });
}
