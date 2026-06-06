import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { getBusinessReviews } from '../backend/yelp.js';
import { callSonnet, callHaiku } from '../backend/anthropic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USE_MOCK = true;

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockLeads.json'), 'utf-8')
);

const FRANCHISE_INDICATORS = [
  'franchise', 'franchising', 'corporate', 'nationwide', 'locations near you',
  'find a location', 'own a franchise', 'franchise opportunities',
];

function isFranchiseByRules(name, content = '') {
  const lower = `${name} ${content}`.toLowerCase();
  return FRANCHISE_INDICATORS.some((indicator) => lower.includes(indicator));
}

async function isFranchise(name, content = '') {
  if (isFranchiseByRules(name, content)) return true;

  try {
    const { content: result } = await callHaiku({
      system: 'You classify whether a business is a franchise or chain. Reply with only "yes" or "no".',
      messages: [
        {
          role: 'user',
          content: `Business name: ${name}\nWebsite content excerpt: ${content.slice(0, 2000)}`,
        },
      ],
      maxTokens: 10,
    });
    return result.trim().toLowerCase().startsWith('yes');
  } catch {
    return false;
  }
}

function calculatePriorityScore(fit, budget, response) {
  return Math.round((fit * 0.3 + budget * 0.3 + response * 0.4) * 10) / 10;
}

export async function leadAgent(context) {
  if (USE_MOCK) {
    return mockData;
  }

  try {
    const { business, gaps } = context;
    const selectedGap = gaps.gaps[gaps.recommendedGap ?? 0];
    const { places } = await searchPlaces(selectedGap.niche, business.location);

    const leadResults = await Promise.all(
      (places || []).slice(0, 10).map(async (place) => {
        const name = place.displayName?.text || 'Unknown';
        const website = place.websiteUri || '';
        const [scraped, yelpData] = await Promise.all([
          website ? scrapeWebsite(website) : Promise.resolve({ content: '' }),
          getBusinessReviews(name, business.location),
        ]);

        if (await isFranchise(name, scraped.content)) return null;

        const { content } = await callSonnet({
          system: 'You are a lead generation agent. Analyze lead data and return hook, scores, email, and send strategy. Return valid JSON only.',
          messages: [
            {
              role: 'user',
              content: `User business: ${JSON.stringify(business)}\nTarget gap: ${JSON.stringify(selectedGap)}\nLead: ${JSON.stringify({ place, scraped, yelpData })}`,
            },
          ],
        });

        const lead = JSON.parse(content);
        lead.priorityScore = calculatePriorityScore(lead.fitScore, lead.budgetScore, lead.responseScore);
        return lead;
      })
    );

    const leads = leadResults.filter(Boolean).sort((a, b) => b.priorityScore - a.priorityScore);
    return { leads };
  } catch {
    return mockData;
  }
}

export async function* streamLeads(context) {
  const data = await leadAgent(context);
  const leads = [...data.leads].sort((a, b) => b.priorityScore - a.priorityScore);

  for (const lead of leads) {
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));
    yield lead;
  }
}
