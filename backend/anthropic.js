const USE_MOCK = true;

export async function callClaude({ system, messages, model = 'claude-sonnet-4-6' }) {
  if (USE_MOCK) {
    return { content: '', model, mock: true };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

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

  if (!response.ok) throw new Error(`Anthropic API failed: ${response.status}`);
  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    model,
    mock: false,
  };
}

export async function callHaiku({ system, messages }) {
  return callClaude({ system, messages, model: 'claude-3-5-haiku-latest' });
}
