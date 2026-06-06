# HookLine — AI Business Intelligence & Lead Generation

Paste a website URL. HookLine analyzes your business, benchmarks competitors, finds market gaps, and generates qualified leads with personalized outreach emails.

## Local Development

```bash
# Terminal 1
cd backend && npm install && npm start

# Terminal 2
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`

## Railway Deployment

1. Create a new project on [Railway](https://railway.app) and connect this GitHub repo.
2. Railway auto-detects the Node.js app via `railway.toml`.
3. Add these environment variables in the Railway dashboard (optional for mock demo):

| Variable | Required for demo |
|---|---|
| `ANTHROPIC_API_KEY` | No (mock mode) |
| `ANTHROPIC_SONNET_MODEL` | No (defaults to `claude-sonnet-4-6` — all agents) |
| `ANTHROPIC_HAIKU_MODEL` | No (defaults to `claude-3-5-haiku-latest` — franchise classification) |
| `GOOGLE_PLACES_API_KEY` | No (mock mode) |
| `YELP_API_KEY` | No (mock mode) |
| `FIRECRAWL_API_KEY` | No (mock mode) |
| `APIFY_API_KEY` | No (needed for Instagram/Facebook/TikTok scraping) |
| `SENDGRID_API_KEY` | No (mock mode) |
| `FIREBASE_SERVICE_ACCOUNT` | No (skips DB save if missing) |

4. Deploy — Railway runs `npm install`, `npm run build`, then `npm start`.
5. The Express server serves both the API (`/api/*`) and the React frontend from a single URL.

Health check: `GET /api/health`

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore Database**
3. Go to Project Settings → Service Accounts → Generate new private key
4. Add the JSON to Railway as `FIREBASE_SERVICE_ACCOUNT` (paste the full JSON as one line)

Each company run is saved to the `companies` collection with business profile, analysis, competitors, gaps, and leads. Retrieve via `GET /api/companies/:companyId`.

## Social Media Scraping

- **Websites** → Firecrawl
- **Instagram, Facebook, TikTok** → [Apify](https://apify.com) (Firecrawl blocks these with 403)
- Sign up at [console.apify.com](https://console.apify.com), copy your API token to `APIFY_API_KEY`
