import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callSonnet } from '../backend/anthropic.js';
import { USE_MOCK } from '../backend/config.js';
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

export async function gapAgent(context) {
  if (USE_MOCK) {
    return mockData;
  }

  try {
    const { content } = await callSonnet({
      system: GAP_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Full context:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    return parseClaudeJson(content);
  } catch (err) {
    console.error('[gapAgent] Error running agent:', err);
    return mockData;
  }
}
