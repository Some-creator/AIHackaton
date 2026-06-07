import { isSocialHostname, isSocialUrl } from './socialDomains.js';
import { assertPublicHttpUrl } from './security.js';

export async function scrapeWebsite(url) {
  assertPublicHttpUrl(url, 'Website URL');
  try {
    const urlWithProto = url.includes('://') ? url : `http://${url}`;
    const parsed = new URL(urlWithProto);
    if (isSocialHostname(parsed.hostname)) {
      throw new Error(`Social media URLs (${parsed.hostname}) cannot be scraped directly. Please use a standard business website or verify social scraper configuration.`);
    }
  } catch (err) {
    if (err.message.includes('cannot be scraped')) {
      throw err;
    }
    if (isSocialUrl(url)) {
      throw new Error('Social media URLs cannot be scraped directly. Please use a standard business website or verify social scraper configuration.');
    }
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('Website reading is unavailable right now. Please try again later.');
  }

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'links'],
      onlyMainContent: false,
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    const statusHint =
      response.status === 404
        ? 'Page not found (404)'
        : response.status === 403
          ? 'Access blocked (403)'
          : response.status === 408 || response.status === 504
            ? 'Request timed out'
            : null;
    const detail = errBody.slice(0, 200);
    throw new Error(
      statusHint
        ? `Could not read website — ${statusHint}. Check the URL and try your homepage.`
        : `Could not read website (scraper error ${response.status})${detail ? `: ${detail}` : ''}`,
    );
  }

  const data = await response.json();
  const content = data.data?.markdown || data.data?.content || '';
  const links = Array.isArray(data.data?.links) ? data.data.links : [];

  if (!content.trim()) {
    throw new Error('Could not read page content');
  }

  return { url, content, links, success: true, mock: false };
}
