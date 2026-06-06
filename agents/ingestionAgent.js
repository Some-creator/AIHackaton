import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeWebsite } from '../backend/scraper.js';
import { scrapeSocialProfile, canScrapeSocial, needsApify, cleanSocialUrl } from '../backend/apify.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { USE_MOCK, hasFirecrawl, hasAnthropic } from '../backend/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockBusiness.json'), 'utf-8')
);

const VALID_TYPES = ['fixed location', 'mobile vendor', 'service provider'];
const MAX_SOCIAL_SCRAPES = 4;

const SOCIAL_URL_PATTERNS = [
  /https?:\/\/(?:www\.)?instagram\.com\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?facebook\.com\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?tiktok\.com\/@?[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[\w.-]+\/?/gi,
  /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[\w.-]+\/?/gi,
];

const EXTRACTION_SYSTEM = `You are a business data extraction agent. Read scraped website and social media content and extract structured business information.

Rules:
- Only use information explicitly found in the scraped content or provided inputs
- Never invent business names, locations, or services not supported by the content
- Use social media bios and posts to enrich services, target market, and business type
- If location is not stated, infer city/region only if clearly implied (e.g. address, bio, "serving West Houston")
- If location cannot be determined, use "Unknown"
- services must be specific offerings found in the content, not generic guesses
- type must be exactly one of: "fixed location", "mobile vendor", "service provider"
- targetMarket should describe who the business sells to based on site and social language
- socialProfiles should list all social URLs found or provided

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
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http')) return trimmed.replace(/\/+$/, '');
  return `https://${trimmed.replace(/\/+$/, '')}`;
}

function socialLabel(url) {
  if (/instagram/i.test(url)) return 'Instagram';
  if (/facebook/i.test(url)) return 'Facebook';
  if (/twitter|x\.com/i.test(url)) return 'X/Twitter';
  if (/tiktok/i.test(url)) return 'TikTok';
  if (/linkedin/i.test(url)) return 'LinkedIn';
  if (/youtube/i.test(url)) return 'YouTube';
  return 'social profile';
}

function discoverSocialLinks(websiteContent, userProfiles) {
  const links = new Set(userProfiles.map((u) => cleanSocialUrl(normalizeUrl(u))).filter(Boolean));

  for (const pattern of SOCIAL_URL_PATTERNS) {
    const matches = websiteContent.match(pattern) || [];
    matches.forEach((match) => links.add(cleanSocialUrl(normalizeUrl(match))));
  }

  return [...links].slice(0, MAX_SOCIAL_SCRAPES);
}

async function scrapeSocialProfiles(urls, onLog) {
  if (!urls.length) return [];

  const results = [];

  for (const rawUrl of urls) {
    const url = cleanSocialUrl(rawUrl);
    const label = socialLabel(url);

    try {
      if (needsApify(url)) {
        if (!canScrapeSocial(url)) {
          onLog?.(`${label} needs Apify — skipped (add APIFY_API_KEY)`);
          continue;
        }
        onLog?.(`Reading ${label} via Apify...`);
        const scraped = await scrapeSocialProfile(url);
        if (scraped?.content?.trim()) {
          results.push(scraped);
          onLog?.(`${label} profile loaded`);
        }
        continue;
      }

      if (!canScrapeSocial(url)) continue;

      onLog?.(`Reading ${label}...`);
      const scraped = await scrapeWebsite(url);
      if (scraped.content?.trim()) {
        results.push({
          url,
          content: scraped.content.slice(0, 8000),
          mock: scraped.mock ?? false,
          source: 'firecrawl',
        });
        onLog?.(`${label} loaded`);
      }
    } catch (err) {
      console.warn(`[ingestionAgent] Social scrape failed for ${url}: ${err.message}`);
      onLog?.(`Could not read ${label} — continuing`);
    }
  }

  return results;
}

function formatSocialContent(socialScrapes) {
  if (!socialScrapes.length) return 'No social media content scraped.';

  return socialScrapes
    .map(({ url, content }) => `--- SOCIAL: ${url} ---\n${content}`)
    .join('\n\n');
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

  const mergedSocial = [...new Set([
    ...socialProfiles.map(normalizeUrl).filter(Boolean),
    ...(Array.isArray(business.socialProfiles) ? business.socialProfiles.map(normalizeUrl) : []),
  ])];

  return {
    business: {
      name: business.name.trim(),
      location: business.location?.trim() || 'Unknown',
      services: business.services.map((s) => String(s).trim()).filter(Boolean),
      type: normalizedType,
      targetMarket: business.targetMarket?.trim() || 'Local customers',
      website: normalizeUrl(business.website || url),
      socialProfiles: mergedSocial,
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
  const normalizedSocial = socialProfiles.map(normalizeUrl).filter(Boolean);

  if (!normalizedUrl) {
    throw new Error('Website URL is required');
  }

  yield { type: 'log', message: 'Starting website analysis...' };
  await delay(300);

  if (shouldUseMock()) {
    yield { type: 'log', message: 'Reading your website...' };
    await delay(500);

    const mockSocial = normalizedSocial.length
      ? normalizedSocial
      : ['https://instagram.com/example'];

    for (const profile of mockSocial.slice(0, MAX_SOCIAL_SCRAPES)) {
      yield { type: 'log', message: `Checking ${socialLabel(profile)}...` };
      await delay(400);
    }

    yield { type: 'log', message: 'Extracting business name and services...' };
    await delay(500);
    yield { type: 'log', message: 'Building your business profile...' };
    await delay(400);
    const mockScrapes = [];
    for (const profile of mockSocial.slice(0, MAX_SOCIAL_SCRAPES)) {
      try {
        const scraped = await scrapeSocialProfile(profile);
        if (scraped) mockScrapes.push(scraped);
      } catch { /* skip */ }
    }
    const result = mockFallback(normalizedUrl, mockSocial, 'USE_MOCK enabled or API keys missing');
    yield { type: 'log', message: `Found: ${result.business.name}` };
    yield { type: 'complete', ...result, socialScrapes: mockScrapes };
    return;
  }

  try {
    yield { type: 'log', message: `Connecting to ${normalizedUrl}...` };
    const scraped = await scrapeWebsite(normalizedUrl);

    if (scraped.mock) {
      yield { type: 'log', message: 'Using demo data...' };
      const socialUrls = discoverSocialLinks(scraped.content, normalizedSocial);
      const mockScrapes = [];
      for (const profile of socialUrls.slice(0, MAX_SOCIAL_SCRAPES)) {
        try {
          const s = await scrapeSocialProfile(profile);
          if (s) mockScrapes.push(s);
        } catch { /* skip */ }
      }
      const result = mockFallback(normalizedUrl, socialUrls.length ? socialUrls : normalizedSocial, 'scraper returned mock');
      yield { type: 'complete', ...result, socialScrapes: mockScrapes };
      return;
    }

    yield { type: 'log', message: 'Website content loaded successfully' };

    const socialUrls = discoverSocialLinks(scraped.content, normalizedSocial);

    let socialScrapes = [];
    if (socialUrls.length) {
      yield { type: 'log', message: `Found ${socialUrls.length} social profile${socialUrls.length > 1 ? 's' : ''} to check` };

      const pendingLogs = [];
      socialScrapes = await scrapeSocialProfiles(socialUrls, (msg) => pendingLogs.push(msg));
      for (const msg of pendingLogs) {
        yield { type: 'log', message: msg };
      }

      if (socialScrapes.length) {
        yield { type: 'log', message: `Loaded content from ${socialScrapes.length} social profile${socialScrapes.length > 1 ? 's' : ''}` };
      } else {
        yield { type: 'log', message: 'Could not load social pages — using website only' };
      }
    } else {
      yield { type: 'log', message: 'No social profiles found — using website only' };
    }

    yield { type: 'log', message: 'AI is analyzing your website and social presence...' };

    const truncatedContent = scraped.content.slice(0, 30000);
    const socialContent = formatSocialContent(socialScrapes);

    yield { type: 'log', message: 'Extracting business name, location, and services...' };
    const { content } = await callSonnet({
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Extract the business profile from this website and social media content.

Website URL: ${normalizedUrl}
User-provided social profiles: ${JSON.stringify(normalizedSocial)}
Discovered social profiles: ${JSON.stringify(socialUrls)}

--- WEBSITE CONTENT ---
${truncatedContent}

--- SOCIAL MEDIA CONTENT ---
${socialContent}`,
        },
      ],
    });

    yield { type: 'log', message: 'Structuring your business profile...' };
    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed, normalizedUrl, socialUrls);

    yield { type: 'log', message: `Found: ${result.business.name} · ${result.business.services.length} services` };
    yield { type: 'complete', ...result, socialScrapes };
  } catch (err) {
    yield { type: 'log', message: 'Switching to backup data...' };
    const result = mockFallback(normalizedUrl, normalizedSocial, err.message);
    yield { type: 'complete', ...result, socialScrapes: [] };
  }
}

export async function ingestionAgent(url, socialProfiles = []) {
  let result = null;
  for await (const event of streamIngestion(url, socialProfiles)) {
    if (event.type === 'complete') result = event;
  }
  return { business: result.business, mock: result.mock, socialScrapes: result.socialScrapes || [] };
}
