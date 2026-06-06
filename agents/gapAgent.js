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

export async function gapAgent(context) {
  if (!hasAnthropic) {
    throw new Error('AI analysis unavailable — ANTHROPIC_API_KEY not configured');
  }

  const { business, analysis, competitors } = context;
  if (!business) throw new Error('Business profile required');
  if (!competitors || competitors.length === 0) throw new Error('Competitor data required for gap analysis');

  const { content } = await callSonnet({
    system: GAP_SYSTEM,
    messages: [{
      role: 'user',
      content: `Find market gaps for this business.\n\n--- BUSINESS ---\n${JSON.stringify(business, null, 2)}\n\n--- SWOT ANALYSIS ---\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPETITORS ---\n${JSON.stringify(competitors, null, 2)}`,
    }],
  });

  const result = parseClaudeJson(content);
  if (!Array.isArray(result?.gaps) || result.gaps.length === 0) {
    throw new Error('Could not identify market gaps from the available data');
  }
  return result;
}
