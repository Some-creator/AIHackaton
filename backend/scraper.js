const USE_MOCK = true;

export async function scrapeWebsite(url) {
  if (USE_MOCK) {
    return {
      url,
      content: `Mock scraped content from ${url}. Business offers printing, direct mail, and graphic design services in Houston, TX.`,
      success: true,
    };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  });

  if (!response.ok) throw new Error(`Firecrawl scrape failed: ${response.status}`);
  const data = await response.json();
  return { url, content: data.data?.markdown || '', success: true };
}
