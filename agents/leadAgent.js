import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { getBusinessReviews } from '../backend/yelp.js';
import { callSonnet, callHaiku } from '../backend/anthropic.js';
import { USE_MOCK } from '../backend/config.js';
import { parseClaudeJson } from '../backend/parseJson.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const LEAD_SYSTEM = `You are a lead generation agent. Analyze the provided lead details (Google place, website content, Yelp reviews) and compare them with the user's business profile and the target market gap opportunity.

Generate:
1. A compelling "hook" (why this business needs the user's services right now).
2. Scores (fitScore, budgetScore, responseScore) between 1 and 10.
3. A personalized cold outreach email tailored to the hook.
4. A send strategy (best channel, timing, and follow-up plan).

You must return ONLY a valid JSON object matching this schema:
{
  "hook": "string",
  "fitScore": number,
  "budgetScore": number,
  "responseScore": number,
  "email": "string",
  "sendStrategy": {
    "channel": "string",
    "timing": "string",
    "followUp": "string"
  }
}

Do not include any other keys, markdown, or text outside the JSON.`;

export async function leadAgent(context) {
  if (USE_MOCK) {
    return mockData;
  }

  try {
    const { business, gaps } = context;
    const selectedGap = gaps.gaps[gaps.recommendedGap ?? 0];
    
    // Build a targeted search query for POTENTIAL CLIENTS (businesses that would buy from the user)
    // Use the recommendedTarget description to search for the right type of customer business
    // e.g., if gap is "Corporate Coffee Catering" and target is "local restaurants & cafes",
    // search for "restaurants" or "cafes" rather than "B2B Corporate Coffee Catering"
    const buildLeadQuery = () => {
      const target = selectedGap.recommendedTarget || '';
      const niche = selectedGap.niche || '';
      const primaryService = business.services?.[0] || '';
      
      // Extract the most searchable term: prefer recommendedTarget (who to sell to)
      // Strip B2B/corporate/specialty prefix words to get the actual business type
      const cleanTarget = target
        .replace(/\b(b2b|corporate|specialty|boutique|artisan|high-end|premium|local|small|independent)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Use the first meaningful phrase from recommendedTarget
      const firstPhrase = cleanTarget.split(/[,;]/)[0].trim();
      
      // Fall back to niche if target is too long or vague
      if (firstPhrase && firstPhrase.split(' ').length <= 4) {
        return firstPhrase;
      }
      // If niche is short and descriptive, use it
      if (niche.split(' ').length <= 4) {
        return niche;
      }
      // Last resort: use business primary service
      return primaryService || 'local business';
    };
    
    const searchQuery = buildLeadQuery();
    console.log(`[leadAgent] Searching for leads with query: "${searchQuery}" in ${business.location}`);
    const { places } = await searchPlaces(searchQuery, business.location);

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
          system: LEAD_SYSTEM,
          messages: [
            {
              role: 'user',
              content: `User business: ${JSON.stringify(business)}\nTarget gap: ${JSON.stringify(selectedGap)}\nLead: ${JSON.stringify({ place, scraped, yelpData })}`,
            },
          ],
        });

        const parsedLead = parseClaudeJson(content);
        const lead = {
          name,
          address: place.formattedAddress || '',
          phone: place.nationalPhoneNumber || '',
          website,
          lat: place.location?.latitude || null,
          lng: place.location?.longitude || null,
          ...parsedLead,
        };
        lead.priorityScore = calculatePriorityScore(lead.fitScore, lead.budgetScore, lead.responseScore);
        return lead;
      })
    );

    const leads = leadResults.filter(Boolean).sort((a, b) => b.priorityScore - a.priorityScore);
    return { leads };
  } catch (err) {
    console.error('[leadAgent] Error running agent:', err);
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
