

const PLACES_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount,places.location,places.nationalPhoneNumber';

export async function searchPlaces(query, location) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: `${query} in ${location}` }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Google Places search failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return { places: data.places || [], query, location, mock: false };
}

export async function getPlaceDetails(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName,formattedAddress,websiteUri,rating,userRatingCount,reviews',
    },
  });

  if (!response.ok) throw new Error(`Google Places details failed: ${response.status}`);
  return { placeId, details: await response.json(), mock: false };
}
