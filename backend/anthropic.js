import {
  useMockFor,
  ANTHROPIC_MODEL,
  ANTHROPIC_REASONING_MODEL,
  ANTHROPIC_HAIKU_MODEL,
} from './config.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function requestAnthropic({ model, system, messages, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Anthropic API failed (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.content?.find((block) => block.type === 'text')?.text || '';

  if (!content) {
    throw new Error('Anthropic returned empty response');
  }

  return { content, model, mock: false };
}

export async function callClaude({ system, messages, model = ANTHROPIC_MODEL, maxTokens = 4096 }) {
  if (useMockFor('anthropic')) {
    return { content: '', model, mock: true };
  }

  console.log(`[anthropic] Calling model: ${model}`);
  return requestAnthropic({ model, system, messages, maxTokens });
}

export async function callReasoning({ system, messages, maxTokens = 4096 }) {
  return callClaude({ system, messages, model: ANTHROPIC_REASONING_MODEL, maxTokens });
}

export async function callHaiku({ system, messages }) {
  return callClaude({ system, messages, model: ANTHROPIC_HAIKU_MODEL });
}
