import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeWebsite } from '../backend/scraper.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { USE_MOCK, hasFirecrawl, hasAnthropic } from '../backend/config.js';

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  if (!hasFirecrawl || !hasAnthropic) return true;
  return false;
}

export async function* streamIngestion(url, socialProfiles = []) {
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    throw new Error('Website URL is required');
  }

  yield { type: 'log', message: 'Starting website analysis...' };
  await delay(300);

  if (shouldUseMock()) {
    yield { type: 'log', message: 'Reading your website...' };
    await delay(500);
    yield { type: 'log', message: 'Extracting business name and services...' };
    await delay(500);
    yield { type: 'log', message: 'Building your business profile...' };
    await delay(400);
    const result = mockFallback(normalizedUrl, socialProfiles, 'USE_MOCK enabled or API keys missing');
    yield { type: 'log', message: `Found: ${result.business.name}` };
    yield { type: 'complete', ...result };
    return;
  }

  try {
    yield { type: 'log', message: `Connecting to ${normalizedUrl}...` };
    const scraped = await scrapeWebsite(normalizedUrl);

    if (scraped.mock) {
      yield { type: 'log', message: 'Using demo data...' };
      const result = mockFallback(normalizedUrl, socialProfiles, 'scraper returned mock');
      yield { type: 'complete', ...result };
      return;
    }

    yield { type: 'log', message: 'Website content loaded successfully' };
    await delay(200);
    yield { type: 'log', message: 'AI is reading your pages...' };
    await delay(300);

    const truncatedContent = scraped.content.slice(0, 30000);

    yield { type: 'log', message: 'Extracting business name, location, and services...' };
    const { content } = await callSonnet({
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

    yield { type: 'log', message: 'Structuring your business profile...' };
    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed, normalizedUrl, socialProfiles);

    yield { type: 'log', message: `Found: ${result.business.name} · ${result.business.services.length} services` };
    yield { type: 'complete', ...result };
  } catch (err) {
    yield { type: 'log', message: 'Switching to backup data...' };
    const result = mockFallback(normalizedUrl, socialProfiles, err.message);
    yield { type: 'complete', ...result };
  }
}

export async function ingestionAgent(url, socialProfiles = []) {
  let result = null;
  for await (const event of streamIngestion(url, socialProfiles)) {
    if (event.type === 'complete') result = event;
  }
  return { business: result.business, mock: result.mock };
}
