import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const USE_MOCK = process.env.USE_MOCK === 'true';

export const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
export const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash';
export const OPENROUTER_HAIKU_MODEL = process.env.OPENROUTER_HAIKU_MODEL || 'deepseek/deepseek-v4-flash';

export function useMockFor(service) {
  if (USE_MOCK) return true;
  if (service === 'firecrawl') return !hasFirecrawl;
  if (service === 'openrouter') return !hasOpenRouter;
  return false;
}
