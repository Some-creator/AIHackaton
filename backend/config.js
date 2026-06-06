export const USE_MOCK = process.env.USE_MOCK === 'true';

export const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
export const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
export const OPENROUTER_REASONING_MODEL = process.env.OPENROUTER_REASONING_MODEL || 'anthropic/claude-sonnet-4';
export const OPENROUTER_HAIKU_MODEL = process.env.OPENROUTER_HAIKU_MODEL || 'anthropic/claude-3-haiku';

export function useMockFor(service) {
  if (USE_MOCK) return true;
  if (service === 'firecrawl') return !hasFirecrawl;
  if (service === 'openrouter') return !hasOpenRouter;
  return false;
}
