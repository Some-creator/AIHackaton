import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { callClaude } from '../backend/anthropic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USE_MOCK = true;

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockCompetitors.json'), 'utf-8')
);

export async function benchmarkAgent(context) {
  if (USE_MOCK) {
    return mockData;
  }

  try {
    const { business, analysis } = context;
    const { places } = await searchPlaces(business.services[0], business.location);

    const competitorData = await Promise.all(
      (places || []).slice(0, 5).map(async (place) => {
        const website = place.websiteUri || '';
        const scraped = website ? await scrapeWebsite(website) : { content: '' };
        return { place, scraped };
      })
    );

    const { content } = await callClaude({
      system: 'You are a competitive analysis agent. Compare competitors to the user business. Return valid JSON with competitors array.',
      messages: [
        {
          role: 'user',
          content: `Business: ${JSON.stringify(business)}\nAnalysis: ${JSON.stringify(analysis)}\nCompetitor data: ${JSON.stringify(competitorData)}`,
        },
      ],
    });

    return JSON.parse(content);
  } catch {
    return mockData;
  }
}
