export const USE_MOCK = process.env.USE_MOCK === 'true';

export const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
export const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
export const ANTHROPIC_REASONING_MODEL = process.env.ANTHROPIC_REASONING_MODEL || 'claude-sonnet-4-6';
export const ANTHROPIC_HAIKU_MODEL = process.env.ANTHROPIC_HAIKU_MODEL || 'claude-3-5-haiku-latest';

export function useMockFor(service) {
  if (USE_MOCK) return true;
  if (service === 'firecrawl') return !hasFirecrawl;
  if (service === 'anthropic') return !hasAnthropic;
  return false;
}
