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
export const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
export const hasApify = Boolean(process.env.APIFY_API_KEY);
export const hasGooglePlaces = Boolean(process.env.GOOGLE_PLACES_API_KEY);

export const SONNET_MODEL = process.env.ANTHROPIC_SONNET_MODEL || 'claude-sonnet-4-6';
export const HAIKU_MODEL = process.env.ANTHROPIC_HAIKU_MODEL || 'claude-3-5-haiku-latest';

export function useMockFor(service) {
  if (USE_MOCK) return true;
  if (service === 'firecrawl') return !hasFirecrawl;
  if (service === 'anthropic') return !hasAnthropic;
  if (service === 'apify') return !hasApify;
  if (service === 'googlePlaces') return !hasGooglePlaces;
  return false;
}
