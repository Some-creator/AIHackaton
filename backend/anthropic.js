import {
  useMockFor,
  OPENROUTER_MODEL,
  OPENROUTER_REASONING_MODEL,
  OPENROUTER_HAIKU_MODEL,
} from './config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CLAUDE_FALLBACKS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'anthropic/claude-sonnet-4',
];

const LEGACY_MODEL_MAP = {
  'claude-sonnet-4-6': OPENROUTER_REASONING_MODEL,
  'claude-3-5-haiku-latest': OPENROUTER_HAIKU_MODEL,
};

const PRIVACY_ERROR_HINT =
  'OpenRouter privacy settings are blocking Claude models. ' +
  'Go to https://openrouter.ai/settings/privacy and allow Anthropic under your data policy.';

function resolveModel(model) {
  return LEGACY_MODEL_MAP[model] || model || OPENROUTER_MODEL;
}

function isPolicyError(status, errBody) {
  return (
    status === 404 &&
    (errBody.includes('guardrail') ||
      errBody.includes('data policy') ||
      errBody.includes('No endpoints'))
  );
}

async function requestOpenRouter({ model, system, messages, maxTokens }) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://github.com/Some-creator/AIHackaton',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'HookLine',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
      provider: {
        data_collection: 'allow',
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    const error = new Error(`OpenRouter API failed (${response.status}): ${errBody.slice(0, 300)}`);
    error.status = response.status;
    error.isPolicyError = isPolicyError(response.status, errBody);
    throw error;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content) {
    throw new Error('OpenRouter returned empty response');
  }

  return { content, model, mock: false };
}

async function callWithFallbacks({ system, messages, model, maxTokens }) {
  const primaryModel = resolveModel(model);
  const modelsToTry = [primaryModel, ...CLAUDE_FALLBACKS.filter((m) => m !== primaryModel)];

  let lastPolicyError = null;

  for (const tryModel of modelsToTry) {
    try {
      console.log(`[openrouter] Trying model: ${tryModel}`);
      return await requestOpenRouter({ model: tryModel, system, messages, maxTokens });
    } catch (err) {
      if (err.isPolicyError) {
        lastPolicyError = err;
        console.warn(`[openrouter] Policy block on ${tryModel}, trying fallback...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`${lastPolicyError?.message || 'All Claude models blocked'}. ${PRIVACY_ERROR_HINT}`);
}

export async function callClaude({ system, messages, model = OPENROUTER_MODEL, maxTokens = 4096 }) {
  if (useMockFor('openrouter')) {
    return { content: '', model: resolveModel(model), mock: true };
  }

  return callWithFallbacks({ system, messages, model, maxTokens });
}

export async function callReasoning({ system, messages, maxTokens = 4096 }) {
  return callClaude({ system, messages, model: OPENROUTER_REASONING_MODEL, maxTokens });
}

export async function callHaiku({ system, messages }) {
  return callClaude({ system, messages, model: OPENROUTER_HAIKU_MODEL });
}
