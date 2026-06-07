import { callSonnet } from '../backend/anthropic.js';
import { parseClaudeJson } from '../backend/parseJson.js';
import { hasAnthropic } from '../backend/config.js';

const ANALYSIS_FIELDS = ['niche', 'strengths', 'weaknesses', 'improvements', 'missing'];

const ANALYSIS_SYSTEM = `You are a business consultant. Analyze the business profile and give a direct, honest assessment.

Rules:
- Base every point on the provided profile only
- Be concise: 2-3 bullet points per section, one sentence each
- No fluff — each point must be specific and actionable
- strengths: what the business is genuinely doing well
- weaknesses: real gaps or shortcomings
- improvements: concrete actions the owner can take right now
- missing: things similar businesses have that this one lacks
- niche: the precise business category customers would search for (e.g. "coffee shop / café", "taco restaurant", "mobile coffee cart", "dental clinic", "hair salon") — must be specific enough to distinguish from adjacent categories; used by competitor and lead agents

Return ONLY valid JSON:
{
  "analysis": {
    "niche": "string",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "improvements": ["string"],
    "missing": ["string"]
  }
}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    if (field === 'niche') {
      const value = String(analysis[field] || '').trim();
      if (!value) throw new Error('analysis.niche is required');
      normalized[field] = value;
      continue;
    }
    normalized[field] = normalizeStringArray(analysis[field], field);
  }
  return { analysis: normalized, mock: false };
}

export async function* streamAnalysis(context) {
  if (!context?.business) {
    throw new Error('Business profile required');
  }
  if (!hasAnthropic) {
    throw new Error('AI analysis is unavailable right now. Please try again later.');
  }

  const { business } = context;
  const serviceCount = business.services?.length || 0;

  yield { type: 'log', message: 'Time for a gentle(ish) roast...' };
  await delay(300);

  yield { type: 'log', message: `Pulling up the file on ${business.name}...` };
  await delay(400);
  yield { type: 'log', message: `Counting your ${serviceCount} service${serviceCount === 1 ? '' : 's'} in ${business.location || 'your market'}...` };
  await delay(300);
  yield { type: 'log', message: 'AI is doing the SWOT thing. No crying in the debrief.' };

  const { content } = await callSonnet({
    system: ANALYSIS_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Analyze this verified business profile:\n\n${JSON.stringify(business, null, 2)}`,
      },
    ],
  });

  yield { type: 'log', message: 'Packaging feedback into bite-sized truths...' };
  const parsed = parseClaudeJson(content);
  const result = validateAndNormalize(parsed);

  yield {
    type: 'log',
    message: `Roast complete — ${result.analysis.strengths.length} strengths, ${result.analysis.improvements.length} recommendations. You survived.`,
  };
  yield { type: 'complete', ...result };
}

export async function analysisAgent(context) {
  let result = null;
  for await (const event of streamAnalysis(context)) {
    if (event.type === 'complete') result = event;
    if (event.type === 'error') throw new Error(event.error);
  }
  return { analysis: result.analysis, mock: result.mock };
}
