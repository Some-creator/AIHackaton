const SOCIAL_DOMAINS = /instagram\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com|linkedin\.com|youtube\.com/i;

export async function scrapeWebsite(url) {
  try {
    const urlWithProto = url.includes('://') ? url : `http://${url}`;
    const parsed = new URL(urlWithProto);
    if (SOCIAL_DOMAINS.test(parsed.hostname)) {
      throw new Error(`Social media URLs (${parsed.hostname}) cannot be scraped directly. Please use a standard business website or verify social scraper configuration.`);
    }
  } catch (err) {
    if (err.message.includes('cannot be scraped')) {
      throw err;
    }
    if (SOCIAL_DOMAINS.test(url)) {
      throw new Error('Social media URLs cannot be scraped directly. Please use a standard business website or verify social scraper configuration.');
    }
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('Website scraper unavailable — FIRECRAWL_API_KEY not configured');
  }

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Firecrawl scrape failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.data?.markdown || data.data?.content || '';

  if (!content.trim()) {
    throw new Error('Firecrawl returned empty content');
  }

  return { url, content, success: true, mock: false };
}
