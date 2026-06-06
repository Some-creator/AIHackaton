import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeWebsite } from '../backend/scraper.js';
import { callClaude } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { USE_MOCK, hasFirecrawl, hasOpenRouter } from '../backend/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockBusiness.json'), 'utf-8')
);

const VALID_TYPES = ['fixed location', 'mobile vendor', 'service provider'];

const EXTRACTION_SYSTEM = `You are a business data extraction agent. Read scraped website content and extract structured business information.

Rules:
- Only use information explicitly found in the scraped content or provided inputs
- Never invent business names, locations, or services not supported by the content
- If location is not stated, infer city/region only if clearly implied (e.g. address, "serving West Houston")
- If location cannot be determined, use "Unknown"
- services must be specific offerings found on the site, not generic guesses
- type must be exactly one of: "fixed location", "mobile vendor", "service provider"
- targetMarket should describe who the business sells to based on site language

Return ONLY valid JSON matching this exact schema:
{
  "business": {
    "name": "string",
    "location": "string",
    "services": ["string"],
    "type": "fixed location | mobile vendor | service provider",
    "targetMarket": "string",
    "website": "string",
    "socialProfiles": ["string"]
  }
}`;

function normalizeUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

function mockFallback(url, socialProfiles, reason) {
  console.warn(`[ingestionAgent] Falling back to mock data: ${reason}`);
  return {
    business: {
      ...mockData.business,
      website: normalizeUrl(url) || mockData.business.website,
      socialProfiles: socialProfiles.length > 0 ? socialProfiles : mockData.business.socialProfiles,
    },
    mock: true,
  };
}

function validateAndNormalize(profile, url, socialProfiles) {
  const business = profile?.business;
  if (!business || typeof business !== 'object') {
    throw new Error('Missing business object in Claude response');
  }

  if (!business.name?.trim()) throw new Error('Business name is required');
  if (!Array.isArray(business.services) || business.services.length === 0) {
    throw new Error('At least one service is required');
  }

  const type = business.type?.trim().toLowerCase();
  const normalizedType = VALID_TYPES.find((t) => t === type) || 'service provider';

  return {
    business: {
      name: business.name.trim(),
      location: business.location?.trim() || 'Unknown',
      services: business.services.map((s) => String(s).trim()).filter(Boolean),
      type: normalizedType,
      targetMarket: business.targetMarket?.trim() || 'Local customers',
      website: normalizeUrl(business.website || url),
      socialProfiles: socialProfiles.length > 0
        ? socialProfiles
        : (Array.isArray(business.socialProfiles) ? business.socialProfiles : []),
    },
    mock: false,
  };
}

function shouldUseMock() {
  if (USE_MOCK) return true;
  if (!hasFirecrawl || !hasOpenRouter) return true;
  return false;
}

export async function ingestionAgent(url, socialProfiles = []) {
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    throw new Error('Website URL is required');
  }

  if (shouldUseMock()) {
    return mockFallback(normalizedUrl, socialProfiles, 'USE_MOCK enabled or API keys missing');
  }

  try {
    console.log(`[ingestionAgent] Scraping ${normalizedUrl}`);
    const scraped = await scrapeWebsite(normalizedUrl);

    if (scraped.mock) {
      return mockFallback(normalizedUrl, socialProfiles, 'scraper returned mock');
    }

    const truncatedContent = scraped.content.slice(0, 30000);

    console.log(`[ingestionAgent] Extracting business profile via OpenRouter`);
    const { content } = await callClaude({
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Extract the business profile from this website content.

Website URL: ${normalizedUrl}
User-provided social profiles: ${JSON.stringify(socialProfiles)}

--- WEBSITE CONTENT ---
${truncatedContent}`,
        },
      ],
    });

    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed, normalizedUrl, socialProfiles);

    console.log(`[ingestionAgent] Extracted profile for: ${result.business.name}`);
    return result;
  } catch (err) {
    return mockFallback(normalizedUrl, socialProfiles, err.message);
  }
}
