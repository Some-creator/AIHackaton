import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { hasAnthropic } from '../backend/config.js';

const ANALYSIS_FIELDS = ['strengths', 'weaknesses', 'improvements', 'missing'];

const ANALYSIS_SYSTEM = `You are a business consultant. Analyze the business profile and give a direct, honest assessment.

Rules:
- Base every point on the provided profile only
- Be concise: 2-3 bullet points per section, one sentence each
- No fluff — each point must be specific and actionable
- strengths: what the business is genuinely doing well
- weaknesses: real gaps or shortcomings
- improvements: concrete actions the owner can take right now
- missing: things similar businesses have that this one lacks

Return ONLY valid JSON:
{
  "analysis": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "improvements": ["string"],
    "missing": ["string"]
  }
}`;

function normalizeStringArray(value, fieldName) {
  if (!Array.isArray(value)) throw new Error(`analysis.${fieldName} must be an array`);
  const items = value.map((item) => String(item).trim()).filter(Boolean);
  if (items.length < 1) throw new Error(`analysis.${fieldName} must have at least 1 item`);
  return items.slice(0, 5);
}

function validateAndNormalize(parsed) {
  const analysis = parsed?.analysis;
  if (!analysis || typeof analysis !== 'object') throw new Error('Missing analysis object in response');
  const normalized = {};
  for (const field of ANALYSIS_FIELDS) {
    normalized[field] = normalizeStringArray(analysis[field], field);
  }
  return { analysis: normalized, mock: false };
}

export async function analysisAgent(context) {
  if (!context?.business) throw new Error('Business profile required');

  if (!hasAnthropic) {
    throw new Error('AI analysis unavailable — ANTHROPIC_API_KEY not configured');
  }

  console.log(`[analysisAgent] Analyzing: ${context.business.name}`);
  const { content } = await callSonnet({
    system: ANALYSIS_SYSTEM,
    messages: [{
      role: 'user',
      content: `Analyze this business:\n\n${JSON.stringify(context.business, null, 2)}`,
    }],
  });

  const parsed = parseClaudeJson(content);
  const result = validateAndNormalize(parsed);
  console.log(`[analysisAgent] Done: ${context.business.name}`);
  return result;
}
