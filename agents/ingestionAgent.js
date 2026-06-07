import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeWebsite } from '../backend/scraper.js';
import { scrapeSocialProfile, canScrapeSocial, needsApify, cleanSocialUrl } from '../backend/apify.js';
import { geocodeLocation } from '../backend/googlePlaces.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { hasFirecrawl, hasAnthropic, hasGooglePlaces } from '../backend/config.js';
import {
  buildBusinessLocationFields,
  extractAddressCandidates,
  geocodeMatchesLocation,
  isLocationComplete,
} from '../backend/locationUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const EXTRACTION_SYSTEM = `You are a business data extraction agent. Extract structured business info from scraped website and social media content.

Rules:
- Only use info explicitly found in the content — never invent names, locations, or services
- Location must be as specific as possible: city, US state (2-letter), and ZIP when present
- Many US cities share names across states (e.g. Richmond VA vs Richmond TX) — never guess the state
- Prefer a full mailing/store address from contact, footer, or about pages over vague regional phrases
- If only a metro or region is mentioned without a clear city + state, set locationConfidence to "low"
- If city or state cannot be determined, leave city/state null and locationConfidence "unknown"
- services must be specific offerings from the content, not guesses
- type must be exactly one of: "fixed location", "mobile vendor", "service provider"
- targetMarket: who the business sells to, based on site/social language

Return ONLY valid JSON:
{
  "business": {
    "name": "string",
    "city": "string | null",
    "state": "2-letter US state | null",
    "zipCode": "5-digit ZIP | null",
    "location": "City, ST or City, ST ZIP — only when city and state are known",
    "locationConfidence": "high | low | unknown",
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
        results.push({ url, content: scraped.content.slice(0, 8000), mock: scraped.mock ?? false, source: 'firecrawl' });
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
  return socialScrapes.map(({ url, content }) => `--- SOCIAL: ${url} ---\n${content}`).join('\n\n');
}

async function verifyExtractedLocation(locationFields, onLog) {
  if (!hasGooglePlaces || !isLocationComplete(locationFields)) {
    return locationFields;
  }

  try {
    const anchor = await geocodeLocation(locationFields.location);
    if (!anchor?.formattedAddress) return locationFields;

    const matches = geocodeMatchesLocation(anchor.formattedAddress, locationFields);
    if (matches) {
      onLog?.(`Location verified: ${locationFields.location}`);
      return {
        ...locationFields,
        locationConfidence: locationFields.zipCode ? 'high' : 'medium',
        locationNeedsInput: false,
        locationMessage: null,
      };
    }

    onLog?.(`Could not verify ${locationFields.location} — please confirm city, state, and ZIP`);
    return {
      ...locationFields,
      locationConfidence: 'low',
      locationNeedsInput: true,
      locationMessage: 'We found a possible location but could not verify it. Please confirm your city, state, and ZIP.',
    };
  } catch (err) {
    console.warn(`[ingestionAgent] Location verify failed: ${err.message}`);
    return locationFields;
  }
}

function validateAndNormalize(profile, url, socialProfiles, addressCandidates) {
  const business = profile?.business;
  if (!business || typeof business !== 'object') throw new Error('Missing business object in Claude response');
  if (!business.name?.trim()) throw new Error('Business name is required');
  if (!Array.isArray(business.services) || business.services.length === 0) throw new Error('At least one service is required');

  const type = business.type?.trim().toLowerCase();
  const normalizedType = VALID_TYPES.find((t) => t === type) || 'service provider';

  const mergedSocial = [...new Set([
    ...socialProfiles.map(normalizeUrl).filter(Boolean),
    ...(Array.isArray(business.socialProfiles) ? business.socialProfiles.map(normalizeUrl) : []),
  ])];

  const locationFields = buildBusinessLocationFields(business, addressCandidates);

  return {
    business: {
      name: business.name.trim(),
      city: locationFields.city,
      state: locationFields.state,
      zipCode: locationFields.zipCode,
      location: locationFields.location,
      locationNeedsInput: locationFields.locationNeedsInput,
      locationConfidence: locationFields.locationConfidence,
      locationMessage: locationFields.locationMessage,
      services: business.services.map((s) => String(s).trim()).filter(Boolean),
      type: normalizedType,
      targetMarket: business.targetMarket?.trim() || 'Local customers',
      website: normalizeUrl(business.website || url),
      socialProfiles: mergedSocial,
    },
    mock: false,
  };
}

export async function* streamIngestion(url, socialProfiles = []) {
  const normalizedUrl = normalizeUrl(url);
  const normalizedSocial = socialProfiles.map(normalizeUrl).filter(Boolean);

  if (!normalizedUrl) throw new Error('Website URL is required');

  if (!hasFirecrawl) {
    yield { type: 'error', error: 'Website scraping unavailable — FIRECRAWL_API_KEY not set in .env' };
    return;
  }
  if (!hasAnthropic) {
    yield { type: 'error', error: 'AI analysis unavailable — ANTHROPIC_API_KEY not set in .env' };
    return;
  }

  yield { type: 'log', message: 'Starting website analysis...' };
  await delay(300);

  try {
    yield { type: 'log', message: `Connecting to ${normalizedUrl}...` };
    const scraped = await scrapeWebsite(normalizedUrl);

    if (scraped.mock) {
      throw new Error('Could not read website content — the scraper returned no data. Check the URL is publicly accessible.');
    }

    yield { type: 'log', message: 'Website loaded' };

    const socialUrls = discoverSocialLinks(scraped.content, normalizedSocial);

    let socialScrapes = [];
    if (socialUrls.length) {
      yield { type: 'log', message: `Found ${socialUrls.length} social profile${socialUrls.length > 1 ? 's' : ''}` };
      const labels = socialUrls.map((u) => socialLabel(cleanSocialUrl(u))).join(', ');
      yield { type: 'log', message: `Reading ${labels} — this step can take 10–30 seconds...` };
      const pendingLogs = [];
      socialScrapes = await scrapeSocialProfiles(socialUrls, (msg) => pendingLogs.push(msg));
      for (const msg of pendingLogs) yield { type: 'log', message: msg };
    } else {
      yield { type: 'log', message: 'No social profiles found — using website only' };
    }

    yield { type: 'log', message: 'AI extracting business profile...' };

    const truncatedContent = scraped.content.slice(0, 30000);
    const socialContent = formatSocialContent(socialScrapes);
    const combinedContent = `${truncatedContent}\n\n${socialScrapes.map((s) => s.content).join('\n')}`;
    const addressCandidates = extractAddressCandidates(combinedContent);

    if (addressCandidates.length) {
      yield {
        type: 'log',
        message: `Found ${addressCandidates.length} address hint${addressCandidates.length > 1 ? 's' : ''} on site`,
      };
    }

    const { content } = await callSonnet({
      system: EXTRACTION_SYSTEM,
      messages: [{
        role: 'user',
        content: `Extract the business profile.

Website URL: ${normalizedUrl}

Address hints detected in content (use only if they match this business — do not invent):
${addressCandidates.length
  ? addressCandidates.map((c) => `- ${c.location} (${c.source})`).join('\n')
  : '- none'}

--- WEBSITE CONTENT ---
${truncatedContent}

--- SOCIAL MEDIA ---
${socialContent}`,
      }],
    });

    yield { type: 'log', message: 'Structuring profile...' };
    const parsed = parseClaudeJson(content);
    let result = validateAndNormalize(parsed, normalizedUrl, socialUrls, addressCandidates);

    const pendingVerifyLogs = [];
    const verifiedLocation = await verifyExtractedLocation(result.business, (msg) => pendingVerifyLogs.push(msg));
    for (const msg of pendingVerifyLogs) yield { type: 'log', message: msg };

    result = {
      ...result,
      business: {
        ...result.business,
        ...verifiedLocation,
        location: verifiedLocation.location || result.business.location,
      },
    };

    if (result.business.locationNeedsInput) {
      yield { type: 'log', message: 'Location needs confirmation — you will be asked to verify city, state, and ZIP' };
    } else {
      yield { type: 'log', message: `Location: ${result.business.location}` };
    }

    yield { type: 'log', message: `Found: ${result.business.name}` };
    yield { type: 'complete', ...result, socialScrapes };
  } catch (err) {
    yield { type: 'error', error: err.message };
  }
}

export async function ingestionAgent(url, socialProfiles = []) {
  let result = null;
  for await (const event of streamIngestion(url, socialProfiles)) {
    if (event.type === 'complete') result = event;
    if (event.type === 'error') throw new Error(event.error);
  }
  return { business: result.business, mock: result.mock, socialScrapes: result.socialScrapes || [] };
}
