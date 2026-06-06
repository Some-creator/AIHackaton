import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callClaude } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { USE_MOCK, hasOpenRouter } from '../backend/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockAnalysis.json'), 'utf-8')
);

const ANALYSIS_FIELDS = ['strengths', 'weaknesses', 'improvements', 'missing'];

const ANALYSIS_SYSTEM = `You are an honest business consultant. Analyze the verified business profile and produce a consultant-style assessment.

Rules:
- Base every point only on the provided business profile — do not invent facts
- If information is missing from the profile, note it in weaknesses or missing
- Each bullet must reference something concrete: services, target market, location, business type, or website presence
- Do not name specific competitors — compare implicitly to what similar businesses likely offer
- strengths: 3-5 specific things the business is doing well
- weaknesses: 3-5 honest gaps or areas falling short
- improvements: 3-5 actionable recommendations the owner can implement
- missing: 3-5 elements competitors likely have that this business lacks

Return ONLY valid JSON matching this exact schema:
{
  "analysis": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "improvements": ["string"],
    "missing": ["string"]
  }
}`;

function mockFallback(reason) {
  console.warn(`[analysisAgent] Falling back to mock data: ${reason}`);
  return { ...mockData, mock: true };
}

function normalizeStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`analysis.${fieldName} must be an array`);
  }

  const items = value.map((item) => String(item).trim()).filter(Boolean);
  if (items.length < 2) {
    throw new Error(`analysis.${fieldName} must have at least 2 items`);
  }
  if (items.length > 6) {
    return items.slice(0, 6);
  }
  return items;
}

function validateAndNormalize(parsed) {
  const analysis = parsed?.analysis;
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('Missing analysis object in LLM response');
  }

  const normalized = {};
  for (const field of ANALYSIS_FIELDS) {
    normalized[field] = normalizeStringArray(analysis[field], field);
  }

  return { analysis: normalized, mock: false };
}

function shouldUseMock() {
  if (USE_MOCK) return true;
  if (!hasOpenRouter) return true;
  return false;
}

export async function analysisAgent(context) {
  if (!context?.business) {
    throw new Error('Business profile required');
  }

  if (shouldUseMock()) {
    return mockFallback('USE_MOCK enabled or OPENROUTER_API_KEY missing');
  }

  try {
    console.log(`[analysisAgent] Analyzing business: ${context.business.name}`);
    const { content } = await callClaude({
      system: ANALYSIS_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Analyze this verified business profile:\n\n${JSON.stringify(context.business, null, 2)}`,
        },
      ],
    });

    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed);

    console.log(`[analysisAgent] Analysis complete for: ${context.business.name}`);
    return result;
  } catch (err) {
    return mockFallback(err.message);
  }
}
