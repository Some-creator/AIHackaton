export const USE_MOCK = process.env.USE_MOCK === 'true';

export const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
export const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

// DeepSeek-only models (hackathon constraint)
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
export const OPENROUTER_REASONING_MODEL = process.env.OPENROUTER_REASONING_MODEL || 'deepseek/deepseek-r1';
export const OPENROUTER_FAST_MODEL = process.env.OPENROUTER_FAST_MODEL || 'deepseek/deepseek-chat';

export function useMockFor(service) {
  if (USE_MOCK) return true;
  if (service === 'firecrawl') return !hasFirecrawl;
  if (service === 'openrouter') return !hasOpenRouter;
  return false;
}
