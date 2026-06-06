import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { scrapeWebsite } from '../backend/scraper.js';
import { callClaude } from '../backend/anthropic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USE_MOCK = true;

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockBusiness.json'), 'utf-8')
);

export async function ingestionAgent(url, socialProfiles = []) {
  if (USE_MOCK) {
    const business = {
      ...mockData.business,
      website: url || mockData.business.website,
      socialProfiles: socialProfiles.length > 0 ? socialProfiles : mockData.business.socialProfiles,
    };
    return { business };
  }

  try {
    const scraped = await scrapeWebsite(url);
    const { content } = await callClaude({
      system: 'You are a business data extraction agent. Extract structured business information from website content. Return valid JSON only.',
      messages: [
        {
          role: 'user',
          content: `Extract business profile from this website content:\n\n${scraped.content}\n\nWebsite URL: ${url}\nSocial profiles: ${JSON.stringify(socialProfiles)}`,
        },
      ],
    });

    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    const business = {
      ...mockData.business,
      website: url || mockData.business.website,
      socialProfiles,
    };
    return { business };
  }
}
