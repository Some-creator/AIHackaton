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
| `OPENROUTER_API_KEY` | No (mock mode) |
| `OPENROUTER_MODEL` | No (defaults to `anthropic/claude-3.5-sonnet`) |
| `GOOGLE_PLACES_API_KEY` | No (mock mode) |
| `YELP_API_KEY` | No (mock mode) |
| `FIRECRAWL_API_KEY` | No (mock mode) |
| `SENDGRID_API_KEY` | No (mock mode) |

4. Deploy — Railway runs `npm install`, `npm run build`, then `npm start`.
5. The Express server serves both the API (`/api/*`) and the React frontend from a single URL.

Health check: `GET /api/health`

## OpenRouter Troubleshooting

If you see `No endpoints available matching your guardrail restrictions and data policy`:

1. Open https://openrouter.ai/settings/privacy
2. Under **Data Policy**, allow providers that may store data (disable strict "deny all" if enabled)
3. Under **Zero Data Retention**, disable ZDR for Anthropic unless you have credits on ZDR-only endpoints
4. Save settings and retry

HookLine also auto-falls back across several models (`claude-3.5-sonnet`, `claude-3-haiku`, `gemini-2.0-flash`) if the primary model is blocked.