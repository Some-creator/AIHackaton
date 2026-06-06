import { useMockFor } from './config.js';

export async function scrapeWebsite(url) {
  if (useMockFor('firecrawl')) {
    return {
      url,
      content: `Mock scraped content from ${url}. Business offers printing, direct mail, and graphic design services in Houston, TX.`,
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
