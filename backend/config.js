export const USE_MOCK = process.env.USE_MOCK === 'true';

export const hasFirecrawl = Boolean(process.env.FIRECRAWL_API_KEY);
export const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

export function useMockFor(service) {
  if (USE_MOCK) return true;
  if (service === 'firecrawl') return !hasFirecrawl;
  if (service === 'anthropic') return !hasAnthropic;
  return false;
}
