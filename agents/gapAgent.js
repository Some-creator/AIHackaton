import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callClaude } from '../backend/anthropic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USE_MOCK = true;

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockGap.json'), 'utf-8')
);

export async function gapAgent(context) {
  if (USE_MOCK) {
    return mockData;
  }

  try {
    const { content } = await callClaude({
      system: 'You are a market gap analysis agent. Identify untapped niches competitors are not serving. Rank gaps by opportunity size. Return valid JSON with gaps array and recommendedGap index.',
      messages: [
        {
          role: 'user',
          content: `Full context:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    return JSON.parse(content);
  } catch {
    return mockData;
  }
}
