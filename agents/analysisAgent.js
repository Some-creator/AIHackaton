import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { USE_MOCK, hasAnthropic } from '../backend/config.js';

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mockFallback(reason) {
  console.warn(`[analysisAgent] Falling back to mock data: ${reason}`);
  return { ...mockData, mock: true, mockReason: reason };
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

function getMockBlockReason() {
  if (USE_MOCK) return 'USE_MOCK is enabled';
  if (!hasAnthropic) return 'ANTHROPIC_API_KEY is missing';
  return null;
}

function shouldUseMock() {
  return Boolean(getMockBlockReason());
}

export async function* streamAnalysis(context) {
  if (!context?.business) {
    throw new Error('Business profile required');
  }

  const { business } = context;
  const serviceCount = business.services?.length || 0;

  yield { type: 'log', message: 'Starting business analysis...' };
  await delay(300);

  const mockBlockReason = getMockBlockReason();
  if (mockBlockReason) {
    yield { type: 'log', message: `Live analysis unavailable — ${mockBlockReason}` };
    await delay(400);
    yield { type: 'log', message: `Reviewing profile for ${business.name}...` };
    await delay(500);
    yield { type: 'log', message: `Evaluating ${serviceCount} service${serviceCount === 1 ? '' : 's'} and target market...` };
    await delay(500);
    yield { type: 'log', message: 'Identifying strengths and gaps...' };
    await delay(400);
    yield { type: 'log', message: 'Building recommendations...' };
    await delay(400);
    const result = mockFallback(mockBlockReason);
    yield { type: 'log', message: 'Analysis complete (demo data)' };
    yield { type: 'complete', ...result };
    return;
  }

  try {
    yield { type: 'log', message: `Reviewing profile for ${business.name}...` };
    await delay(400);
    yield { type: 'log', message: `Evaluating ${serviceCount} service${serviceCount === 1 ? '' : 's'} in ${business.location || 'your market'}...` };
    await delay(300);
    yield { type: 'log', message: 'AI is assessing strengths, weaknesses, and opportunities...' };

    const { content } = await callSonnet({
      system: ANALYSIS_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Analyze this verified business profile:\n\n${JSON.stringify(business, null, 2)}`,
        },
      ],
    });

    yield { type: 'log', message: 'Structuring strengths and improvement areas...' };
    const parsed = parseClaudeJson(content);
    const result = validateAndNormalize(parsed);

    yield {
      type: 'log',
      message: `Analysis complete — ${result.analysis.strengths.length} strengths, ${result.analysis.improvements.length} recommendations`,
    };
    yield { type: 'complete', ...result };
  } catch (err) {
    yield { type: 'log', message: 'Switching to backup analysis data...' };
    const result = mockFallback(err.message);
    yield { type: 'complete', ...result };
  }
}

export async function analysisAgent(context) {
  let result = null;
  for await (const event of streamAnalysis(context)) {
    if (event.type === 'complete') result = event;
  }
  return { analysis: result.analysis, mock: result.mock, mockReason: result.mockReason };
}
