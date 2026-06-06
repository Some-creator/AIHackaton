import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { callClaude } from '../backend/anthropic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USE_MOCK = true;

const mockData = JSON.parse(
  readFileSync(join(__dirname, '../mock/mockAnalysis.json'), 'utf-8')
);

export async function analysisAgent(context) {
  if (USE_MOCK) {
    return mockData;
  }

  try {
    const { content } = await callClaude({
      system: 'You are a business consultant. Analyze the business profile and return strengths, weaknesses, improvements, and missing elements. Return valid JSON only.',
      messages: [
        {
          role: 'user',
          content: `Analyze this business:\n${JSON.stringify(context.business, null, 2)}`,
        },
      ],
    });

    return JSON.parse(content);
  } catch {
    return mockData;
  }
}
