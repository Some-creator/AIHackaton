import { useMockFor } from './config.js';

export async function callClaude({ system, messages, model = 'claude-sonnet-4-6' }) {
  if (useMockFor('anthropic')) {
    return { content: '', model, mock: true };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Anthropic API failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.content?.find((block) => block.type === 'text')?.text || '';

  if (!content) {
    throw new Error('Anthropic returned empty response');
  }

  return { content, model, mock: false };
}

export async function callHaiku({ system, messages }) {
  return callClaude({ system, messages, model: 'claude-3-5-haiku-latest' });
}
