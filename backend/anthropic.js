import { useMockFor, OPENROUTER_MODEL, OPENROUTER_HAIKU_MODEL } from './config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const LEGACY_MODEL_MAP = {
  'claude-sonnet-4-6': OPENROUTER_MODEL,
  'claude-3-5-haiku-latest': OPENROUTER_HAIKU_MODEL,
};

function resolveModel(model) {
  return LEGACY_MODEL_MAP[model] || model || OPENROUTER_MODEL;
}

export async function callClaude({ system, messages, model = OPENROUTER_MODEL, maxTokens = 4096 }) {
  if (useMockFor('openrouter')) {
    return { content: '', model: resolveModel(model), mock: true };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  const resolvedModel = resolveModel(model);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://github.com/Some-creator/AIHackaton',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'HookLine',
    },
    body: JSON.stringify({
      model: resolvedModel,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`OpenRouter API failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content) {
    throw new Error('OpenRouter returned empty response');
  }

  return { content, model: resolvedModel, mock: false };
}

export async function callHaiku({ system, messages }) {
  return callClaude({ system, messages, model: OPENROUTER_HAIKU_MODEL });
}
