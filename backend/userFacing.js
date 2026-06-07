/** Strip vendor/API names from messages shown in the activity log or UI. */
export function sanitizeUserMessage(message) {
  const m = String(message || '').trim();
  if (!m) return 'Something went wrong. Please try again.';

  if (/Social media URLs/i.test(m)) {
    return 'That looks like a social profile link. Use your business website above and add social links in the optional field.';
  }
  if (/APIFY|Apify/i.test(m)) {
    if (/empty content|returned empty/i.test(m)) {
      return 'Could not read that social profile — try a business website instead.';
    }
    return 'Social profile reading is unavailable right now.';
  }
  if (/FIRECRAWL|Firecrawl/i.test(m)) {
    if (/empty content|returned empty/i.test(m)) {
      return "We couldn't read that website. Check the URL and try again.";
    }
    if (/not configured|not set|unavailable/i.test(m)) {
      return 'Website reading is unavailable right now. Please try again later.';
    }
    return "We couldn't read that page — try your homepage URL.";
  }
  if (/GOOGLE_PLACES|Google Places/i.test(m)) {
    if (/not configured|missing|not set/i.test(m)) {
      return 'Local business search is unavailable right now. Please try again later.';
    }
    return 'Local search hit a snag — continuing where possible.';
  }
  if (/ANTHROPIC|Anthropic/i.test(m)) {
    if (/not configured|not set|missing|unavailable/i.test(m)) {
      return 'AI analysis is unavailable right now. Please try again later.';
    }
    return 'AI analysis hit a snag — please try again.';
  }
  if (/YELP|Yelp/i.test(m)) {
    return 'Review lookup failed — continuing with available data.';
  }
  if (/API keys?|API_KEY/i.test(m)) {
    return 'This step is temporarily unavailable. Please try again later.';
  }

  return m;
}
