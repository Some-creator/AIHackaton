import { SONNET_MODEL } from './config.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function validateModel(model) {
  const lower = model.toLowerCase();
  if (!lower.includes('sonnet')) {
    throw new Error(
      `Model "${model}" is not allowed. This project only uses Sonnet (claude-sonnet-4-6).`,
    );
  }
}

async function requestAnthropic({ model, system, messages, maxTokens }) {
  validateModel(model);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI analysis unavailable — ANTHROPIC_API_KEY not configured');
  }

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

export async function callSonnet({ system, messages, maxTokens = 4096 }) {
  console.log(`[anthropic] Sonnet: ${SONNET_MODEL}`);
  return requestAnthropic({ model: SONNET_MODEL, system, messages, maxTokens });
}

// Backward-compatible aliases
export const callClaude = callSonnet;
export const callReasoning = callSonnet;
/** @deprecated Use callSonnet — Haiku is no longer used in this project */
export const callHaiku = callSonnet;
