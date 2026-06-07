export const FREE_SCAN_COUNT = 1;

export const SCAN_PACKS = [
  {
    id: 'solo',
    name: 'Solo Cast',
    tagline: 'One more website, fully analyzed',
    scans: 1,
    priceLabel: '$9',
    perScanLabel: '$9 / scan',
    features: ['Full pipeline run', 'Leads included', 'Saved to dashboard'],
  },
  {
    id: 'reel',
    name: 'The Reel Deal',
    tagline: 'Compare a few prospects before you commit',
    scans: 3,
    priceLabel: '$19',
    perScanLabel: '$6.33 / scan',
    badge: 'Most popular',
    savings: 'Save 30%',
    features: ['Everything in Solo Cast', '3 separate websites', 'Best for side-by-side research'],
    featured: true,
  },
  {
    id: 'spread',
    name: 'Full Spread',
    tagline: 'For agencies, consultants, and power users',
    scans: 5,
    priceLabel: '$29',
    perScanLabel: '$5.80 / scan',
    badge: 'Best value',
    savings: 'Save 36%',
    features: ['Everything in Solo Cast', '5 full pipeline runs', 'Lowest cost per scan'],
  },
];

export const SCAN_INCLUDES = [
  'Website & social profile ingestion',
  'AI business analysis',
  'Competitor benchmarking',
  'Market gap discovery',
  'Qualified lead generation',
  'Saved history in your dashboard',
];

export const PRICING_FAQ = [
  {
    q: 'What counts as one scan?',
    a: 'One scan is one full HookLine run — from URL paste through lead generation. Re-opening a saved analysis from your dashboard does not use another scan.',
  },
  {
    q: 'Do scans expire?',
    a: 'No. Buy a pack whenever you need it; your scans sit in your account until you use them.',
  },
  {
    q: 'Why no subscription?',
    a: 'Most people only need to analyze a handful of websites. Pay-per-scan keeps it honest — you only pay when you actually need intelligence.',
  },
  {
    q: 'Can I try before I buy?',
    a: 'Yes. Every account gets one free full scan when you sign up. No credit card required for that first run.',
  },
];

export function getPackById(packId) {
  return SCAN_PACKS.find((p) => p.id === packId) || null;
}
