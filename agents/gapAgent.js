import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callSonnet } from '../backend/anthropic.js';
import { USE_MOCK, hasAnthropic } from '../backend/config.js';
import { parseClaudeJson } from '../backend/parseJson.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockGap.json'), 'utf-8')
);

const GAP_SYSTEM = `You are a market gap analysis agent. Analyze the user's business profile, their strengths/weaknesses analysis, and their competitors to identify untapped niches or services in the local market.
Rank the identified gaps by opportunity size and select the best one.

You must return ONLY a valid JSON object matching this schema:
{
  "gaps": [
    {
      "niche": "Short title describing the untapped niche or market gap",
      "demand": "A detailed explanation of why customer demand exists for this niche",
      "competitionLevel": "low" | "medium" | "high",
      "opportunity": "Why the user's business is uniquely suited to capture this niche and how it compares to competitors",
      "recommendedTarget": "Specific description of the ideal customer profile to target"
    }
  ],
  "recommendedGap": 0
}

Identify 2 to 4 distinct gaps. RecommendedGap should be the index (0-based) of the top gap.
No markdown or text outside the JSON block.`;

const COMPETITION_LEVELS = new Set(['low', 'medium', 'high']);
const GAP_FIELDS = ['niche', 'demand', 'competitionLevel', 'opportunity', 'recommendedTarget'];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mockFallback(reason) {
  console.warn(`[gapAgent] Falling back to mock data: ${reason}`);
  return { ...mockData, mock: true, mockReason: reason };
}

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

function getMockBlockReason() {
  if (USE_MOCK) return 'USE_MOCK is enabled';
  if (!hasAnthropic) return 'ANTHROPIC_API_KEY is missing';
  return null;
}

export async function* streamGaps(context) {
  if (!context?.business) {
    throw new Error('Business profile required');
  }
  if (!context?.competitors?.length) {
    throw new Error('Competitors required — run Agent 3 first');
  }

  const { business, competitors } = context;
  const competitorCount = competitors.length;

  yield { type: 'log', message: 'Starting market gap analysis...' };
  await delay(300);

  const mockBlockReason = getMockBlockReason();
  if (mockBlockReason) {
    yield { type: 'log', message: `Live gap analysis unavailable — ${mockBlockReason}` };
    await delay(400);
    yield { type: 'log', message: `Reviewing ${competitorCount} competitor${competitorCount === 1 ? '' : 's'} in ${business.location || 'your market'}...` };
    await delay(500);
    yield { type: 'log', message: 'Analyzing local market landscape...' };
    await delay(500);
    yield { type: 'log', message: 'Identifying untapped niches and service gaps...' };
    await delay(400);
    yield { type: 'log', message: 'Ranking opportunities by demand and fit...' };
    await delay(400);
    const result = mockFallback(mockBlockReason);
    yield { type: 'log', message: `Gap analysis complete (demo data) — ${result.gaps.length} opportunities found` };
    yield { type: 'complete', ...result };
    return;
  }

  try {
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
  } catch (err) {
    yield { type: 'log', message: 'Switching to backup gap analysis data...' };
    const result = mockFallback(err.message);
    yield { type: 'complete', ...result };
  }
}

export async function gapAgent(context) {
  let result = null;
  for await (const event of streamGaps(context)) {
    if (event.type === 'complete') result = event;
  }
  return { gaps: result.gaps, recommendedGap: result.recommendedGap };
}
