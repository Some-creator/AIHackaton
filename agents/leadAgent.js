import { searchPlaces } from '../backend/googlePlaces.js';
import { scrapeWebsite } from '../backend/scraper.js';
import { getBusinessReviews } from '../backend/yelp.js';
import { callSonnet, callHaiku } from '../backend/anthropic.js';
import { hasGooglePlaces, hasAnthropic } from '../backend/config.js';
import { parseClaudeJson } from '../backend/parseJson.js';

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
      system: 'Classify if this is a franchise or chain. Reply only "yes" or "no".',
      messages: [{ role: 'user', content: `Business: ${name}\nContent: ${content.slice(0, 1500)}` }],
      maxTokens: 10,
    });
    return result.trim().toLowerCase().startsWith('yes');
  } catch { return false; }
}

function calculatePriorityScore(fit, budget, response) {
  return Math.round((fit * 0.3 + budget * 0.3 + response * 0.4) * 10) / 10;
}

const LEAD_SYSTEM = `You are a sales intelligence agent. Analyze this potential lead and determine if they need the user's services right now.

Rules:
- Be specific and direct — no generic statements
- hook: 1-2 sentences max — a specific observation from their reviews/website that signals they need help NOW
- email: 3-4 sentences — personalized, reference the specific hook, mention one clear benefit, end with a simple question
- fitScore/budgetScore/responseScore: 1-10 each, be realistic
- If this lead doesn't seem like a good fit, give low scores

Return ONLY valid JSON:
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
}`;

export async function leadAgent(context) {
  if (!hasGooglePlaces) {
    throw new Error('Lead search unavailable — GOOGLE_PLACES_API_KEY not configured');
  }
  if (!hasAnthropic) {
    throw new Error('AI analysis unavailable — ANTHROPIC_API_KEY not configured');
  }

  const { business, gaps } = context;
  if (!gaps?.gaps || gaps.gaps.length === 0) throw new Error('Market gap data required');

  const selectedGap = gaps.gaps[gaps.recommendedGap ?? 0];

  // Build a targeted search for POTENTIAL CLIENTS based on who to sell to
  const buildLeadQuery = () => {
    const target = selectedGap.recommendedTarget || '';
    const niche = selectedGap.niche || '';
    const primaryService = business.services?.[0] || '';

    const cleanTarget = target
      .replace(/\b(b2b|corporate|specialty|boutique|artisan|high-end|premium|local|small|independent)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const firstPhrase = cleanTarget.split(/[,;]/)[0].trim();
    if (firstPhrase && firstPhrase.split(' ').length <= 4) return firstPhrase;
    if (niche.split(' ').length <= 4) return niche;
    return primaryService || 'local business';
  };

  const searchQuery = buildLeadQuery();
  console.log(`[leadAgent] Searching: "${searchQuery}" in ${business.location}`);
  const { places } = await searchPlaces(searchQuery, business.location);

  if (!places || places.length === 0) {
    throw new Error(`No leads found for "${searchQuery}" near ${business.location}`);
  }

  const leadResults = await Promise.all(
    (places || []).slice(0, 10).map(async (place) => {
      const name = place.displayName?.text || 'Unknown';
      const website = place.websiteUri || '';

      const [scraped, yelpData] = await Promise.all([
        website ? scrapeWebsite(website).catch(() => ({ content: '' })) : Promise.resolve({ content: '' }),
        getBusinessReviews(name, business.location).catch(() => null),
      ]);

      if (await isFranchise(name, scraped.content)) return null;

      try {
        const { content } = await callSonnet({
          system: LEAD_SYSTEM,
          messages: [{
            role: 'user',
            content: `User business: ${JSON.stringify(business)}\nTarget gap: ${JSON.stringify(selectedGap)}\nAll competitor context: ${JSON.stringify(context.competitors?.slice(0, 3))}\nLead info: ${JSON.stringify({ place, website, reviews: yelpData })}`,
          }],
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
      } catch (err) {
        console.warn(`[leadAgent] Failed to analyze ${name}: ${err.message}`);
        return null;
      }
    })
  );

  const leads = leadResults.filter(Boolean).sort((a, b) => b.priorityScore - a.priorityScore);
  if (leads.length === 0) {
    throw new Error('No qualified leads found — all discovered businesses were either franchises or could not be analyzed');
  }
  return { leads };
}

export async function* streamLeads(context) {
  const data = await leadAgent(context);
  const leads = [...data.leads].sort((a, b) => b.priorityScore - a.priorityScore);
  for (const lead of leads) {
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));
    yield lead;
  }
}
