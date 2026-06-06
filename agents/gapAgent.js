import { callSonnet } from '../backend/anthropic.js';
import { hasAnthropic } from '../backend/config.js';
import { parseClaudeJson } from '../backend/parseJson.js';

const GAP_SYSTEM = `You are an elite, highly creative growth strategist and market analyst.
Your task is to identify 3 distinct, highly creative, and profitable market gaps (untapped niches) that the user's business can capture.

Analyze the business profile, its local competitors, and competitor weaknesses.
Avoid generic, obvious suggestions (like "standard corporate catering" or "extended business hours"). Instead, brainstorm highly compelling, hyper-targeted, and modern business concepts (e.g. unique themes, experiential dining, community-focused activations, collaborative partnerships, or creative micro-services).

For each gap, you must provide:
1. "niche": A catchy, compelling, and professional name for the concept/niche (max 6 words). Make it sound exciting!
2. "demand": A vivid description of why customers want this, outlining the specific pain point or emotional trigger of the target audience (2-3 detailed sentences).
3. "competitionLevel": "low", "medium", or "high" based on actual local competition.
4. "opportunity": A concrete, practical explanation of how the user's unique strengths, ingredients, space, or tools make them uniquely qualified to dominate this niche immediately (2-3 detailed sentences).
5. "recommendedTarget": A hyper-specific description of early adopters and partners, detailing exactly who they are and the online or physical spaces they frequent (e.g. specific local social groups, forums, hashtags, or venue types) (2-3 detailed sentences).

Rank the gaps by order of feasibility and high-margin potential.

Return ONLY valid JSON in this exact format:
{
  "gaps": [
    {
      "niche": "string",
      "demand": "string",
      "competitionLevel": "low | medium | high",
      "opportunity": "string",
      "recommendedTarget": "string"
    }
  ],
  "recommendedGap": 0
}`;

const COMPETITION_LEVELS = new Set(['low', 'medium', 'high']);
const GAP_FIELDS = ['niche', 'demand', 'competitionLevel', 'opportunity', 'recommendedTarget'];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function validateAndNormalize(parsed) {
  const gaps = parsed?.gaps;
  if (!Array.isArray(gaps) || gaps.length < 2) {
    throw new Error('gaps must be an array with at least 2 items');
  }

  const normalizedGaps = gaps.slice(0, 4).map((gap, index) => {
    if (!gap || typeof gap !== 'object') {
      throw new Error(`gaps[${index}] must be an object`);
    }

    const normalized = {};
    for (const field of GAP_FIELDS) {
      const value = String(gap[field] ?? '').trim();
      if (!value) {
        throw new Error(`gaps[${index}].${field} is required`);
      }
      normalized[field] = value;
    }

    const level = normalized.competitionLevel.toLowerCase();
    if (!COMPETITION_LEVELS.has(level)) {
      throw new Error(`gaps[${index}].competitionLevel must be low, medium, or high`);
    }
    normalized.competitionLevel = level;

    return normalized;
  });

  let recommendedGap = Number(parsed.recommendedGap);
  if (!Number.isInteger(recommendedGap) || recommendedGap < 0 || recommendedGap >= normalizedGaps.length) {
    recommendedGap = 0;
  }

  return { gaps: normalizedGaps, recommendedGap, mock: false };
}

export async function* streamGaps(context) {
  if (!context?.business) {
    throw new Error('Business profile required');
  }
  if (!context?.competitors?.length) {
    throw new Error('Competitors required — run Agent 3 first');
  }
  if (!hasAnthropic) {
    throw new Error('AI analysis unavailable — ANTHROPIC_API_KEY not configured');
  }

  const { business, competitors } = context;
  const competitorCount = competitors.length;

  yield { type: 'log', message: 'Starting market gap analysis...' };
  await delay(300);

  yield { type: 'log', message: `Reviewing ${competitorCount} competitor${competitorCount === 1 ? '' : 's'} for ${business.name}...` };
  await delay(400);
  yield { type: 'log', message: `Analyzing local market in ${business.location || 'your area'}...` };
  await delay(300);
  yield { type: 'log', message: 'AI is identifying untapped niches and underserved segments...' };

  const { content } = await callSonnet({
    system: GAP_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Full context:\n${JSON.stringify(context, null, 2)}`,
      },
    ],
  });

  yield { type: 'log', message: 'Ranking opportunities by demand and competitive fit...' };
  const parsed = parseClaudeJson(content);
  const result = validateAndNormalize(parsed);

  const topGap = result.gaps[result.recommendedGap];
  yield {
    type: 'log',
    message: `Gap analysis complete — ${result.gaps.length} opportunities found. Top pick: "${topGap.niche}"`,
  };
  yield { type: 'complete', ...result };
}

export async function gapAgent(context) {
  let result = null;
  for await (const event of streamGaps(context)) {
    if (event.type === 'complete') result = event;
    if (event.type === 'error') throw new Error(event.error);
  }
  return { gaps: result.gaps, recommendedGap: result.recommendedGap };
}
