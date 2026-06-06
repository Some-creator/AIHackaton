# HookLine — AI Business Intelligence & Lead Generation

Paste a website URL. HookLine analyzes your business, benchmarks competitors, finds market gaps, and generates qualified leads with personalized outreach emails.

## Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project.
2. Open **Build → Authentication → Sign-in method** and enable:
   - **Email/Password**
   - **Google** (add your deployed domain + `localhost` to authorized domains)
3. Open **Project settings → Your apps → Web** and register the app.
4. Copy the config into `frontend/.env` (see `frontend/.env.example`):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

5. Restart the frontend dev server. Users must sign in before starting analysis.

For **Railway**, add the same `VITE_*` variables in the dashboard (they are baked in at build time).

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
| `GOOGLE_PLACES_API_KEY` | No (mock mode) |
| `YELP_API_KEY` | No (mock mode) |
| `FIRECRAWL_API_KEY` | No (mock mode) |
| `SENDGRID_API_KEY` | No (mock mode) |

4. Deploy — Railway runs `npm install`, `npm run build`, then `npm start`.
5. The Express server serves both the API (`/api/*`) and the React frontend from a single URL.

Health check: `GET /api/health`