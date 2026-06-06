import { useMockFor } from './config.js';

const SOCIAL_DOMAINS = /instagram\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com|linkedin\.com|youtube\.com/i;

export async function scrapeWebsite(url) {
  if (useMockFor('firecrawl')) {
    const isSocial = SOCIAL_DOMAINS.test(url);
    return {
      url,
      content: isSocial
        ? `Mock social profile from ${url}. Bio: mobile beverage catering for events, weddings, and corporate functions. Specialty coffee drinks and espresso bar services.`
        : `Mock scraped content from ${url}. Business offers printing, direct mail, and graphic design services in Houston, TX.`,
      success: true,
      mock: true,
    };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;

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
