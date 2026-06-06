export async function getBusinessReviews(businessName, location) {
  const apiKey = process.env.YELP_API_KEY;
  if (!apiKey) throw new Error('YELP_API_KEY not configured');

  const searchResponse = await fetch(
    `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(businessName)}&location=${encodeURIComponent(location)}&limit=1`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!searchResponse.ok) throw new Error(`Yelp search failed: ${searchResponse.status}`);
  const searchData = await searchResponse.json();
  const business = searchData.businesses?.[0];
  if (!business) return { businessName, reviews: [], location };

  const reviewsResponse = await fetch(
    `https://api.yelp.com/v3/businesses/${business.id}/reviews`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  if (!reviewsResponse.ok) throw new Error(`Yelp reviews failed: ${reviewsResponse.status}`);
  const reviewsData = await reviewsResponse.json();
  return { businessName, reviews: reviewsData.reviews || [], location };
}
