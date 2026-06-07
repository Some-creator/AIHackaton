import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeWebsite } from '../backend/scraper.js';
import { scrapeSocialProfile, canScrapeSocial, needsApify, cleanSocialUrl } from '../backend/apify.js';
import {
  dedupeSocialProfiles,
  dedupeSocialScrapes,
  extractSocialLinksFromPage,
  partitionSocialLinks,
} from '../backend/socialLinks.js';
import { geocodeLocation } from '../backend/googlePlaces.js';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { hasFirecrawl, hasAnthropic, hasGooglePlaces } from '../backend/config.js';
import { sanitizeUserMessage } from '../backend/userFacing.js';
import {
  buildBusinessLocationFields,
  extractAddressCandidates,
  geocodeMatchesLocation,
  isLocationComplete,
} from '../backend/locationUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const VALID_TYPES = ['fixed location', 'mobile vendor', 'service provider'];
const MAX_SOCIAL_SCRAPES = 4;

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
- socialProfiles: include any Instagram, Facebook, TikTok, X/Twitter, LinkedIn, or YouTube profile URLs found in the website content, footer, or header links

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

const SOCIAL_SUMMARY_SYSTEM = `You summarize scraped social media profile data for a business intelligence dashboard.

Given raw profile stats and sampled posts, return ONLY valid JSON:
{
  "topics": "2-4 concise sentences on what this account posts about — themes, tone, products/services highlighted, and who they seem to speak to. Synthesize across posts; do NOT list or quote individual posts.",
  "engagement": "2-3 concise sentences summarizing follower/like counts, typical post performance, posting activity, and overall engagement level (strong, moderate, or limited). Use numbers when available. If metrics are missing, say what is unknown."
}

Rules:
- Never reproduce post captions verbatim or enumerate posts one-by-one
- Focus on patterns and business-relevant insights
- Keep each field under 80 words`;

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

async function scrapeSocialProfiles(urls, onLog) {
  if (!urls.length) return [];
  
  const promises = urls.map(async (rawUrl) => {
    const url = cleanSocialUrl(rawUrl);
    const label = socialLabel(url);
    try {
      if (needsApify(url)) {
        if (!canScrapeSocial(url)) {
          onLog?.(`${label} said "private account" energy — skipped`);
          return null;
        }
        onLog?.(`Sliding into ${label} (strictly business)...`);
        const scraped = await scrapeSocialProfile(url);
        if (scraped?.content?.trim()) {
          onLog?.(`${label}: accessed. We saw things.`);
          return scraped;
        }
        return null;
      }
      if (!canScrapeSocial(url)) return null;
      onLog?.(`Peeking at ${label}...`);
      const scraped = await scrapeWebsite(url);
      if (scraped.content?.trim()) {
        onLog?.(`${label}: we're in.`);
        return { url, content: scraped.content.slice(0, 8000), mock: scraped.mock ?? false, source: 'firecrawl' };
      }
    } catch (err) {
      console.warn(`[ingestionAgent] Social scrape failed for ${url}: ${err.message}`);
      onLog?.(`${label} ghosted us — moving on`);
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter(Boolean);
}

function formatSocialContent(socialScrapes) {
  if (!socialScrapes.length) return 'No social media content scraped.';
  return socialScrapes.map(({ url, content, summary, platform }) => {
    const header = `--- SOCIAL: ${url}${platform ? ` (${platform})` : ''} ---`;
    if (summary?.topics || summary?.engagement) {
      const parts = [header];
      if (summary.topics) parts.push(`Topics: ${summary.topics}`);
      if (summary.engagement) parts.push(`Engagement: ${summary.engagement}`);
      return parts.join('\n');
    }
    return `${header}\n${content}`;
  }).join('\n\n');
}

async function summarizeSocialScrape(scrape) {
  if (!hasAnthropic || !scrape?.content?.trim()) {
    return null;
  }

  try {
    const { content } = await callSonnet({
      system: SOCIAL_SUMMARY_SYSTEM,
      messages: [{
        role: 'user',
        content: `Platform: ${scrape.platform || socialLabel(scrape.url)}
URL: ${scrape.url}
Source: ${scrape.source || 'unknown'}

Scraped profile and post data:
${scrape.content.slice(0, 6000)}`,
      }],
      maxTokens: 500,
    });

    const parsed = parseClaudeJson(content);
    if (!parsed?.topics && !parsed?.engagement) return null;
    return {
      topics: parsed.topics?.trim() || null,
      engagement: parsed.engagement?.trim() || null,
    };
  } catch (err) {
    console.warn(`[ingestionAgent] Social summary failed for ${scrape.url}: ${err.message}`);
    return null;
  }
}

async function summarizeSocialScrapes(scrapes, onLog) {
  const enriched = [];
  for (const scrape of scrapes) {
    const label = socialLabel(scrape.url);
    onLog?.(`Decoding ${label}'s posting habits...`);
    const summary = await summarizeSocialScrape(scrape);
    enriched.push({ ...scrape, summary });
    if (summary?.topics) {
      onLog?.(`${label} vibes captured.`);
    } else {
      onLog?.(`${label} kept secrets — showing what we could get`);
    }
  }
  return enriched;
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
      onLog?.(`Location checks out: ${locationFields.location}. GPS would be proud.`);
      return {
        ...locationFields,
        locationConfidence: locationFields.zipCode ? 'high' : 'medium',
        locationNeedsInput: false,
        locationMessage: null,
      };
    }

    onLog?.(`Location sus: ${locationFields.location} — you'll need to confirm`);
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

  const mergedSocial = dedupeSocialProfiles([
    ...socialProfiles,
    ...(Array.isArray(business.socialProfiles) ? business.socialProfiles : []),
  ]);

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
    yield { type: 'error', error: 'Website reading is unavailable right now. Please try again later.' };
    return;
  }
  if (!hasAnthropic) {
    yield { type: 'error', error: 'AI analysis is unavailable right now. Please try again later.' };
    return;
  }

  yield { type: 'log', message: 'Booting up the website detective...' };
  await delay(300);

  try {
    yield { type: 'log', message: 'AI is nose-deep in your website. Please don\'t refresh.' };
    let scraped;
    let socialScrapes = [];
    const mainIsSocial = needsApify(normalizedUrl);

    if (mainIsSocial) {
      if (!canScrapeSocial(normalizedUrl)) {
        throw new Error('Social profile links need your business website in the main field — add Instagram or Facebook below instead.');
      }
      yield { type: 'log', message: 'Sliding into your social profile (strictly business)...' };
      const res = await scrapeSocialProfile(normalizedUrl);
      if (!res || !res.content?.trim()) {
        throw new Error('Could not read that social profile — try your business website instead.');
      }
      scraped = {
        url: normalizedUrl,
        content: res.content,
        success: true,
        mock: false,
      };
      socialScrapes.push(res);
    } else {
      scraped = await scrapeWebsite(normalizedUrl);
    }

    if (scraped.mock) {
      throw new Error('Could not read website content — the scraper returned no data. Check the URL is publicly accessible.');
    }

    yield { type: 'log', message: 'Website acquired. No bite marks.' };

    let socialUrls = [];
    let fromWebsite = [];
    if (!mainIsSocial) {
      yield { type: 'log', message: 'Hunting for social links like it\'s 2009...' };
      const discoveredSocial = extractSocialLinksFromPage({
        content: scraped.content,
        links: scraped.links || [],
        userProfiles: normalizedSocial,
      });
      socialUrls = discoveredSocial.slice(0, MAX_SOCIAL_SCRAPES);
      ({ fromWebsite } = partitionSocialLinks(socialUrls, normalizedSocial));
    }

    if (socialUrls.length) {
      if (fromWebsite.length) {
        yield {
          type: 'log',
          message: `Your site snitched on: ${fromWebsite.map((u) => socialLabel(u)).join(', ')}`,
        };
      }
      yield { type: 'log', message: `Spotted ${socialUrls.length} social profile${socialUrls.length > 1 ? 's' : ''}. Judging respectfully.` };
      const labels = socialUrls.map((u) => socialLabel(cleanSocialUrl(u))).join(', ');
      yield { type: 'log', message: `Reading ${labels} — grab a sip, this takes a sec...` };
      const pendingLogs = [];
      socialScrapes = dedupeSocialScrapes(
        await scrapeSocialProfiles(socialUrls, (msg) => pendingLogs.push(msg)),
      );
      for (const msg of pendingLogs) yield { type: 'log', message: msg };

      if (socialScrapes.length) {
        yield { type: 'log', message: 'AI is reading your posts so you don\'t have to...' };
        const summaryLogs = [];
        socialScrapes = await summarizeSocialScrapes(socialScrapes, (msg) => summaryLogs.push(msg));
        for (const msg of summaryLogs) yield { type: 'log', message: msg };
      }
    } else if (!mainIsSocial) {
      yield { type: 'log', message: 'No socials found. Website only. Very mysterious.' };
    }

    yield { type: 'log', message: 'Extracting your business vibe into data...' };

    const truncatedContent = scraped.content.slice(0, 30000);
    const socialContent = formatSocialContent(socialScrapes);
    const combinedContent = `${truncatedContent}\n\n${formatSocialContent(socialScrapes)}`;
    const addressCandidates = extractAddressCandidates(combinedContent);

    if (addressCandidates.length) {
      yield {
        type: 'log',
        message: `Found ${addressCandidates.length} address hint${addressCandidates.length > 1 ? 's' : ''} — detective work pays off`,
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

    yield { type: 'log', message: 'Turning chaos into a neat little profile...' };
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
      yield { type: 'log', message: 'We think we know where you are. You should double-check.' };
    } else {
      yield { type: 'log', message: `Pin dropped: ${result.business.location}` };
    }

    yield { type: 'log', message: `Plot twist: you're ${result.business.name}` };
    yield { type: 'complete', ...result, socialScrapes };
  } catch (err) {
    yield { type: 'error', error: sanitizeUserMessage(err.message) };
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
