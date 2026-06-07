

const APIFY_BASE = 'https://api.apify.com/v2';

const PLATFORMS = {
  instagram: /instagram\.com/i,
  facebook: /facebook\.com|fb\.com/i,
  tiktok: /tiktok\.com/i,
  twitter: /twitter\.com|x\.com/i,
  linkedin: /linkedin\.com/i,
  youtube: /youtube\.com|youtu\.be/i,
};

const APIFY_BLOCKED_ON_FIRECRAWL = /instagram\.com|facebook\.com|tiktok\.com/i;

const ACTORS = {
  instagram: {
    id: 'apify~instagram-scraper',
    buildInput: (url) => ({
      directUrls: [url],
      resultsType: 'details',
      resultsLimit: 1,
    }),
    format: formatInstagramData,
  },
  facebook: {
    id: 'apify~facebook-pages-scraper',
    buildInput: (url) => ({
      startUrls: [{ url }],
      resultsLimit: 1,
    }),
    format: formatFacebookData,
  },
  tiktok: {
    id: 'apify~tiktok-scraper',
    buildInput: (url) => ({
      profiles: [url],
      resultsPerPage: 1,
    }),
    format: formatTikTokData,
  },
};

function getPlatform(url) {
  return Object.entries(PLATFORMS).find(([, pattern]) => pattern.test(url))?.[0] || null;
}

export function needsApify(url) {
  return APIFY_BLOCKED_ON_FIRECRAWL.test(url);
}

export function cleanSocialUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '') || url;
  } catch {
    return url;
  }
}

async function runActor(actorId, input) {
  const token = process.env.APIFY_API_KEY;
  if (!token) throw new Error('APIFY_API_KEY not configured');

  const response = await fetch(
    `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(120000),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Apify failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function formatInstagramData(items) {
  const profile = items.find((item) => item.biography || item.fullName || item.username) || items[0];
  if (!profile) return '';

  const lines = [];
  if (profile.fullName) lines.push(`Name: ${profile.fullName}`);
  if (profile.username) lines.push(`Username: @${profile.username}`);
  if (profile.biography) lines.push(`Bio: ${profile.biography}`);
  if (profile.businessCategoryName) lines.push(`Category: ${profile.businessCategoryName}`);
  if (profile.externalUrl) lines.push(`Website: ${profile.externalUrl}`);
  if (profile.followersCount != null) lines.push(`Followers: ${profile.followersCount}`);
  if (profile.postsCount != null) lines.push(`Posts: ${profile.postsCount}`);

  const posts = items.filter((item) => item.caption).slice(0, 10);
  if (posts.length) {
    lines.push(`Recent posts (${posts.length} sampled):`);
    posts.forEach((post, i) => {
      const metrics = [];
      if (post.likesCount != null) metrics.push(`${post.likesCount} likes`);
      if (post.commentsCount != null) metrics.push(`${post.commentsCount} comments`);
      const metricStr = metrics.length ? ` [${metrics.join(', ')}]` : '';
      lines.push(`  ${i + 1}. ${post.caption?.slice(0, 400)}${metricStr}`);
    });
  }

  return lines.join('\n');
}

function formatFacebookData(items) {
  const page = items[0];
  if (!page) return '';

  const lines = [];
  if (page.title || page.name) lines.push(`Name: ${page.title || page.name}`);
  if (page.about) lines.push(`About: ${page.about}`);
  if (page.description) lines.push(`Description: ${page.description}`);
  if (page.category) lines.push(`Category: ${page.category}`);
  if (page.website) lines.push(`Website: ${page.website}`);
  if (page.likes != null) lines.push(`Page likes: ${page.likes}`);
  if (page.followers != null) lines.push(`Followers: ${page.followers}`);
  if (page.rating != null) lines.push(`Rating: ${page.rating}`);
  if (page.checkIns != null) lines.push(`Check-ins: ${page.checkIns}`);

  const posts = (page.posts || items.filter((item) => item.text || item.message)).slice(0, 8);
  if (posts.length) {
    lines.push(`Recent posts (${posts.length} sampled):`);
    posts.forEach((post, i) => {
      const text = post.text || post.message || '';
      const metrics = [];
      if (post.likes != null) metrics.push(`${post.likes} likes`);
      if (post.comments != null) metrics.push(`${post.comments} comments`);
      if (post.shares != null) metrics.push(`${post.shares} shares`);
      const metricStr = metrics.length ? ` [${metrics.join(', ')}]` : '';
      lines.push(`  ${i + 1}. ${text.slice(0, 400)}${metricStr}`);
    });
  }

  return lines.join('\n');
}

function formatTikTokData(items) {
  const profile = items.find((item) => item.authorMeta || item.nickname || item.signature) || items[0];
  if (!profile) return '';

  const meta = profile.authorMeta || profile;
  const lines = [];
  if (meta.nickname || meta.name) lines.push(`Name: ${meta.nickname || meta.name}`);
  if (meta.signature || profile.signature) lines.push(`Bio: ${meta.signature || profile.signature}`);
  if (meta.fans != null) lines.push(`Followers: ${meta.fans}`);
  if (meta.heart != null) lines.push(`Total likes: ${meta.heart}`);
  if (meta.video != null) lines.push(`Videos: ${meta.video}`);

  const posts = items.filter((item) => item.text || item.desc).slice(0, 10);
  if (posts.length) {
    lines.push(`Recent posts (${posts.length} sampled):`);
    posts.forEach((post, i) => {
      const text = post.text || post.desc || '';
      const metrics = [];
      if (post.diggCount != null) metrics.push(`${post.diggCount} likes`);
      if (post.commentCount != null) metrics.push(`${post.commentCount} comments`);
      if (post.playCount != null) metrics.push(`${post.playCount} views`);
      const metricStr = metrics.length ? ` [${metrics.join(', ')}]` : '';
      lines.push(`  ${i + 1}. ${text.slice(0, 400)}${metricStr}`);
    });
  } else if (profile.text) {
    lines.push(`Recent post: ${profile.text.slice(0, 300)}`);
  }

  return lines.join('\n');
}

export async function scrapeSocialProfile(url) {
  const cleanUrl = cleanSocialUrl(url);
  const platform = getPlatform(cleanUrl);

  const actor = platform && ACTORS[platform];
  if (!actor) {
    return null;
  }

  const token = process.env.APIFY_API_KEY;
  if (!token) {
    throw new Error(`Social profile scraper unavailable — APIFY_API_KEY not configured for ${platform}`);
  }

  const items = await runActor(actor.id, actor.buildInput(cleanUrl));
  const content = actor.format(items);

  if (!content.trim()) {
    throw new Error(`Apify returned empty content for ${platform}`);
  }

  return {
    url: cleanUrl,
    platform,
    content: content.slice(0, 8000),
    mock: false,
    source: 'apify',
  };
}

export function canScrapeSocial(url) {
  const platform = getPlatform(cleanSocialUrl(url));
  if (!platform) return false;
  if (ACTORS[platform]) return Boolean(process.env.APIFY_API_KEY);
  return !needsApify(url);
}
