const USE_MOCK = true;

export async function searchPlaces(query, location) {
  if (USE_MOCK) {
    return { places: [], query, location };
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: `${query} in ${location}` }),
  });

  if (!response.ok) throw new Error(`Google Places search failed: ${response.status}`);
  const data = await response.json();
  return { places: data.places || [], query, location };
}

export async function getPlaceDetails(placeId) {
  if (USE_MOCK) return { placeId, details: {} };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName,formattedAddress,websiteUri,rating,userRatingCount,reviews',
    },
  });

  if (!response.ok) throw new Error(`Google Places details failed: ${response.status}`);
  return { placeId, details: await response.json() };
}
