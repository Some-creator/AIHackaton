# HookLine — AI Business Intelligence & Lead Generation

Paste a website URL. HookLine analyzes your business, benchmarks competitors, finds market gaps, and generates qualified leads with personalized outreach emails.

## Firebase Authentication

### Important: two different configs

| Use case | What you need | Where it goes |
|---|---|---|
| **Login in the browser** | Web app config (`apiKey`, `appId`, etc.) | `frontend/.env` as `VITE_*` variables |
| **Backend token verification** (optional) | Service account JSON | Railway env var only — **never commit** |

**Never paste the service account private key into chat, git, or frontend code.** If you already did, go to [Google Cloud Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) and **delete/regenerate that key immediately**.

### Frontend setup (required for sign-in)

1. Go to [Firebase Console](https://console.firebase.google.com) → project **hackaton-afa63**.
2. Open **Build → Authentication → Sign-in method** and enable **Email/Password** and **Google**.
3. Open **Project settings → Your apps → Web** (register a web app if you haven't).
4. Copy the **firebaseConfig** object into `frontend/.env`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=hackaton-afa63.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hackaton-afa63
VITE_FIREBASE_STORAGE_BUCKET=hackaton-afa63.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

5. Add **Authorized domains**: `localhost` and your Railway URL.
6. Restart the frontend dev server.

For **Railway**, add the same `VITE_*` variables in the dashboard (they are baked in at build time).

### Backend service account (optional)

Only if you need the server to verify Firebase ID tokens: store the full service account JSON in a Railway secret env var (e.g. `FIREBASE_SERVICE_ACCOUNT_JSON`), not in this repository.

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