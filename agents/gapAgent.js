import { callSonnet } from '../backend/anthropic.js';
import { hasAnthropic } from '../backend/config.js';
import { parseClaudeJson } from '../backend/parseJson.js';

const GAP_SYSTEM = `You are a market analyst. Identify untapped niches the user's business can realistically capture based on their profile and what competitors are NOT doing.

Rules:
- Be specific and concise — one sentence per field
- Identify 2-3 distinct gaps only, ranked by opportunity
- Base gaps on the competitor weaknesses and the user's unique strengths
- niche: short title (5 words max)
- demand: why customers want this (one sentence)
- competitionLevel: "low", "medium", or "high"
- opportunity: why the user is positioned to capture this (one sentence)
- recommendedTarget: who exactly to reach out to (one sentence)
- recommendedGap: index of the best gap (0-based)

Return ONLY valid JSON:
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
