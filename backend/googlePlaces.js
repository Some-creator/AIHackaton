const PLACES_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount,places.location,places.nationalPhoneNumber';

const DEFAULT_SEARCH_RADIUS_KM = 50;
const DEFAULT_MAX_DISTANCE_KM = 80;

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

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseLocationHints(location) {
  const trimmed = String(location || '').trim();
  if (!trimmed || trimmed === 'Unknown' || trimmed === 'local area') return {};

  const commaParts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const statePart = commaParts[commaParts.length - 1];
    const abbrev = statePart.length === 2
      ? statePart.toUpperCase()
      : US_ABBREV_BY_NAME[statePart.toLowerCase()];

    return {
      city: commaParts.slice(0, -1).join(', '),
      stateAbbrev: abbrev || null,
      stateName: abbrev ? US_STATE_BY_ABBREV[abbrev] : statePart,
    };
  }

  const suffixMatch = trimmed.match(/\b([A-Z]{2})\b$/);
  if (suffixMatch) {
    const abbrev = suffixMatch[1];
    return {
      city: trimmed.replace(/\s+[A-Z]{2}$/, '').trim(),
      stateAbbrev: abbrev,
      stateName: US_STATE_BY_ABBREV[abbrev],
    };
  }

  const nameMatch = trimmed.match(/\b([A-Za-z][A-Za-z ]+)\s*$/);
  if (nameMatch) {
    const abbrev = US_ABBREV_BY_NAME[nameMatch[1].trim().toLowerCase()];
    if (abbrev) {
      return {
        city: trimmed.slice(0, trimmed.length - nameMatch[1].length).trim(),
        stateAbbrev: abbrev,
        stateName: US_STATE_BY_ABBREV[abbrev],
      };
    }
  }

  return { raw: trimmed };
}

function getAddressStateAbbrev(address) {
  const text = String(address || '').trim();
  if (!text) return null;

  // Prefer ", TX 77469" — avoids false matches like ", Ho" from "Houston"
  const withZip = text.match(/,\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?/);
  if (withZip) return withZip[1].toUpperCase();

  const beforeCountry = text.match(/,\s*([A-Z]{2})\s*,?\s*(?:USA|United States)?\s*$/i);
  if (beforeCountry) return beforeCountry[1].toUpperCase();

  return null;
}

function placeMatchesRegionText(address, hints) {
  const addr = String(address || '').toLowerCase();
  if (!addr) return false;

  if (hints.stateAbbrev) {
    const abbrev = hints.stateAbbrev.toLowerCase();
    if (addr.includes(`, ${abbrev} `) || addr.endsWith(`, ${abbrev}`)) return true;
  }

  if (hints.stateName && addr.includes(hints.stateName.toLowerCase())) {
    return true;
  }

  if (hints.city && addr.includes(hints.city.toLowerCase())) {
    return true;
  }

  return false;
}

export function isPlaceNearLocation(place, anchor, hints, maxDistanceKm = DEFAULT_MAX_DISTANCE_KM) {
  if (!place) return false;

  const address = place.formattedAddress || '';
  const addressState = getAddressStateAbbrev(address);

  if (hints?.stateAbbrev && addressState && addressState !== hints.stateAbbrev) {
    return false;
  }

  if (anchor?.latitude != null && anchor?.longitude != null && place.location?.latitude != null && place.location?.longitude != null) {
    const distanceKm = haversineKm(
      anchor.latitude,
      anchor.longitude,
      place.location.latitude,
      place.location.longitude
    );
    return distanceKm <= maxDistanceKm;
  }

  // Missing address/coordinates — keep result; search was already localized
  if (!address) return true;

  if (hints?.stateAbbrev || hints?.stateName || hints?.city) {
    return placeMatchesRegionText(address, hints);
  }

  return true;
}

function viewportFromCenter(latitude, longitude, radiusKm) {
  const radiusM = radiusKm * 1000;
  const deltaLat = radiusM / 111320;
  const deltaLng = radiusM / (111320 * Math.cos((latitude * Math.PI) / 180));

  return {
    low: {
      latitude: latitude - deltaLat,
      longitude: longitude - deltaLng,
    },
    high: {
      latitude: latitude + deltaLat,
      longitude: longitude + deltaLng,
    },
  };
}

async function placesTextSearch(body, apiKey) {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Google Places search failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  return response.json();
}

export async function geocodeLocation(locationString) {
  const location = String(locationString || '').trim();
  if (!location || location === 'Unknown' || location === 'local area') return null;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const data = await placesTextSearch({
      textQuery: location,
      pageSize: 1,
    }, apiKey);

    const place = data.places?.[0];
    if (place?.location?.latitude == null || place?.location?.longitude == null) {
      return null;
    }

    return {
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      formattedAddress: place.formattedAddress || location,
      hints: parseLocationHints(location),
    };
  } catch (err) {
    console.warn(`[googlePlaces] Geocode failed for "${location}": ${err.message}`);
    return null;
  }
}

function filterPlacesByProximity(places, anchor, hints, maxDistanceKm, onSkip) {
  const kept = [];

  for (const place of places) {
    if (isPlaceNearLocation(place, anchor, hints, maxDistanceKm)) {
      kept.push(place);
      continue;
    }

    const name = place.displayName?.text || place.displayName || 'Unknown';
    const address = place.formattedAddress || '';
    const addressState = getAddressStateAbbrev(address);
    let reason = 'address does not match business region';
    if (anchor && place.location?.latitude != null && place.location?.longitude != null) {
      const distanceKm = haversineKm(
        anchor.latitude,
        anchor.longitude,
        place.location.latitude,
        place.location.longitude
      );
      reason = `outside local search radius (${distanceKm.toFixed(0)} km)`;
    } else if (hints?.stateAbbrev && addressState && addressState !== hints.stateAbbrev) {
      reason = `address state ${addressState} does not match ${hints.stateAbbrev}`;
    }

    onSkip?.({ name, address, reason });
  }

  return kept;
}

function buildSearchBody(cleanQuery, locationString, anchor, radiusKm, relaxed) {
  const body = { pageSize: 20 };

  if (relaxed) {
    body.textQuery = `${cleanQuery} in ${locationString}`;
    if (anchor) {
      body.locationBias = {
        circle: {
          center: { latitude: anchor.latitude, longitude: anchor.longitude },
          radius: radiusKm * 1000,
        },
      };
    }
    return body;
  }

  if (anchor) {
    body.textQuery = cleanQuery;
    body.locationRestriction = {
      rectangle: viewportFromCenter(anchor.latitude, anchor.longitude, radiusKm),
    };
    return body;
  }

  body.textQuery = `${cleanQuery} in ${locationString}`;
  return body;
}

export async function searchPlaces(query, location, options = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const cleanQuery = String(query || '').trim();
  const locationString = String(location || '').trim() || 'local area';
  const radiusKm = options.radiusKm ?? DEFAULT_SEARCH_RADIUS_KM;
  const maxDistanceKm = options.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM;
  const relaxed = options.relaxed ?? false;
  const anchor = options.anchor ?? await geocodeLocation(locationString);
  const hints = anchor?.hints ?? parseLocationHints(locationString);

  const body = buildSearchBody(cleanQuery, locationString, anchor, radiusKm, relaxed);
  const data = await placesTextSearch(body, apiKey);
  const rawCount = data.places?.length || 0;
  const places = filterPlacesByProximity(
    data.places || [],
    anchor,
    hints,
    maxDistanceKm,
    options.onSkip
  );

  return {
    places,
    rawCount,
    query: cleanQuery,
    location: locationString,
    anchor,
    hints,
    relaxed,
    mock: false,
  };
}

export async function getPlaceDetails(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName,formattedAddress,websiteUri,rating,userRatingCount,reviews',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`Google Places details failed: ${response.status}`);
  return { placeId, details: await response.json(), mock: false };
}
