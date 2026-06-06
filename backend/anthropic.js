import { useMockFor, ANTHROPIC_MODEL, ANTHROPIC_HAIKU_MODEL } from './config.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export async function callClaude({ system, messages, model = ANTHROPIC_MODEL, maxTokens = 4096 }) {
  if (useMockFor('anthropic')) {
    return { content: '', model, mock: true };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

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
  const content = data.content?.[0]?.text || '';

  if (!content) {
    throw new Error('Anthropic returned empty response');
  }

  return { content, model, mock: false };
}

export async function callHaiku({ system, messages }) {
  return callClaude({ system, messages, model: ANTHROPIC_HAIKU_MODEL });
}
