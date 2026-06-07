import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { ingestionAgent, streamIngestion } from '../agents/ingestionAgent.js';
import { analysisAgent, streamAnalysis } from '../agents/analysisAgent.js';
import { benchmarkAgent, streamBenchmark } from '../agents/benchmarkAgent.js';
import { gapAgent, streamGaps } from '../agents/gapAgent.js';
import { streamLeads } from '../agents/leadAgent.js';
import { sendEmail } from './sendgrid.js';
import {
  createCompany,
  updateCompany,
  updateCompanyIfAllowed,
  assertCompanyWritable,
  getCompany,
  getCompanyForUser,
  listCompaniesForUser,
  initFirebase,
  getFirebaseStatus,
} from './firebase.js';
import { optionalAuth, requireAuth } from './auth.js';
import {
  assertPublicHttpUrl,
  createRateLimiter,
  createSessionId,
  getCorsOptions,
  isValidEmail,
} from './security.js';
import {
  FREE_SCAN_COUNT,
  SCAN_PACKS,
  getOrCreateUserCredits,
  purchaseScanPack,
  consumeScan,
} from './credits.js';
import {
  hasAnthropic,
  hasGooglePlaces,
  hasFirecrawl,
  hasApify,
} from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const app = express();
const PORT = process.env.PORT || 3001;

const leadSessions = new Map();
const ingestSessions = new Map();
const benchmarkSessions = new Map();
const gapSessions = new Map();
const analysisSessions = new Map();

const corsOptions = getCorsOptions();
if (corsOptions) {
  app.use(cors(corsOptions));
} else {
  app.use(cors());
}

app.use(express.json({ limit: '512kb' }));
app.set('trust proxy', 1);
app.use('/api', optionalAuth);

const agentRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 40 });
const emailRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 });

async function guardCompanyWrite(req, companyId) {
  const check = await assertCompanyWritable(companyId, req.user?.uid || null);
  if (!check.ok) {
    const err = new Error(check.error);
    err.status = 403;
    throw err;
  }
}

function ownerUserId(req, session = null) {
  return session?.userId || session?._ownerUserId || req.user?.uid || null;
}

initFirebase();

function ownerFields(req) {
  return req.user?.uid ? { userId: req.user.uid, userEmail: req.user.email || null } : {};
}

// Opens an SSE response and keeps it alive with periodic heartbeat comments so
// that proxies (e.g. Railway/nginx) don't drop the connection during long,
// silent agent steps. Returns a cleanup function to stop the heartbeat.
function safeWrite(res, req, data) {
  if (req.destroyed || res.writableEnded) return false;
  try {
    res.write(data);
    return true;
  } catch (err) {
    console.warn('[sse] Write failed:', err.message);
    return false;
  }
}

function openSseStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });
  safeWrite(res, req, ': connected\n\n');

  const heartbeat = setInterval(() => {
    if (!res.writableEnded && !req.destroyed) {
      const ok = safeWrite(res, req, ': ping\n\n');
      if (!ok) clearInterval(heartbeat);
    }
  }, 15000);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(heartbeat);
  };

  req.on('close', stop);
  res.on('close', stop);
  return stop;
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'hookline-backend',
    firebase: getFirebaseStatus(),
    services: {
      useMock: false,
      anthropic: hasAnthropic,
      googlePlaces: hasGooglePlaces,
      firecrawl: hasFirecrawl,
      apify: hasApify,
      agent3Live: hasAnthropic && hasGooglePlaces,
    },
  });
});

app.post('/api/ingest', agentRateLimit, async (req, res) => {
  try {
    const { url, socialProfiles = [] } = req.body;
    if (!url) return res.status(400).json({ error: 'Website URL is required' });
    assertPublicHttpUrl(url, 'Website URL');

    const result = await ingestionAgent(url, socialProfiles);
    const { id: companyId, saved, error: saveError } = await createCompany({
      url,
      socialProfiles,
      business: result.business,
      socialScrapes: result.socialScrapes || [],
      step: 'ingested',
      mock: result.mock ?? false,
      ...ownerFields(req),
    });

    res.json({ ...result, companyId, saved, saveError });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/ingest/session', agentRateLimit, async (req, res) => {
  try {
    const { url, socialProfiles = [] } = req.body;
    if (!url) return res.status(400).json({ error: 'Website URL is required' });
    assertPublicHttpUrl(url, 'Website URL');

    let scansRemaining = null;
    if (req.user?.uid) {
      const spent = await consumeScan(req.user.uid);
      if (!spent.ok) {
        return res.status(402).json({
          error: spent.error,
          scansRemaining: spent.scansRemaining ?? 0,
          code: 'NO_SCANS',
        });
      }
      scansRemaining = spent.scansRemaining;
    }

    const sessionId = createSessionId('ingest');
    ingestSessions.set(sessionId, { url, socialProfiles, ...ownerFields(req) });

    setTimeout(() => ingestSessions.delete(sessionId), 10 * 60 * 1000);

    res.json({
      sessionId,
      ...(scansRemaining !== null ? { scansRemaining } : {}),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/ingest/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = ingestSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const stopHeartbeat = openSseStream(req, res);
  safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: 'Preparing analysis...' })}\n\n`);

  let companyId = null;
  const sessionOwner = {
    userId: session.userId || null,
    userEmail: session.userEmail || null,
  };

  try {
    const initialSave = await createCompany({
      url: session.url,
      socialProfiles: session.socialProfiles,
      step: 'ingesting',
      ingestStartedAt: new Date().toISOString(),
      ...sessionOwner,
    });
    companyId = initialSave.id;

    if (initialSave.saved) {
      safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: `Database record created (${companyId})` })}\n\n`);
    } else {
      safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: `Warning: could not save to database — ${initialSave.error || 'Firebase not configured'}` })}\n\n`);
    }

    for await (const event of streamIngestion(session.url, session.socialProfiles)) {
      if (req.destroyed || res.writableEnded) break;
      if (event.type === 'log') {
        const ok = safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: event.message })}\n\n`);
        if (!ok) break;
      } else if (event.type === 'error') {
        safeWrite(res, req, `data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`);
        return;
      } else if (event.type === 'complete') {
        safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: 'Saving your profile...' })}\n\n`);

        let saved = false;
        let saveError = null;

        if (companyId) {
          const update = await updateCompanyIfAllowed(companyId, ownerUserId(req, session), {
            url: session.url,
            socialProfiles: session.socialProfiles,
            business: event.business,
            socialScrapes: event.socialScrapes || [],
            step: 'ingested',
            mock: event.mock ?? false,
            ingestCompletedAt: new Date().toISOString(),
          });
          saved = update.saved;
          saveError = update.error;
        } else {
          const created = await createCompany({
            url: session.url,
            socialProfiles: session.socialProfiles,
            business: event.business,
            socialScrapes: event.socialScrapes || [],
            step: 'ingested',
            mock: event.mock ?? false,
            ingestCompletedAt: new Date().toISOString(),
            ...sessionOwner,
          });
          companyId = created.id;
          saved = created.saved;
          saveError = created.error;
        }

        if (!saved) {
          safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: `Warning: profile not saved to database — ${saveError || 'unknown error'}` })}\n\n`);
        }

        safeWrite(res, req, `data: ${JSON.stringify({
          type: 'complete',
          business: event.business,
          socialScrapes: event.socialScrapes || [],
          mock: event.mock ?? false,
          companyId,
          saved,
          saveError,
        })}\n\n`);
      }
    }
  } catch (err) {
    if (!req.destroyed && !res.writableEnded) {
      safeWrite(res, req, `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    }
  } finally {
    stopHeartbeat();
    ingestSessions.delete(sessionId);
    res.end();
  }
});

app.post('/api/analyze', agentRateLimit, async (req, res) => {
  try {
    const context = req.body;
    if (!context.business) return res.status(400).json({ error: 'Business profile required' });
    await guardCompanyWrite(req, context.companyId);

    const result = await analysisAgent(context);
    if (context.companyId) {
      await updateCompanyIfAllowed(context.companyId, req.user?.uid || null, {
        business: context.business,
        analysis: result.analysis,
        socialScrapes: context.socialScrapes || [],
        step: 'analyzed',
      });
    }
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/analyze/session', agentRateLimit, async (req, res) => {
  try {
    const context = req.body;
    if (!context.business) return res.status(400).json({ error: 'Business profile required' });
    await guardCompanyWrite(req, context.companyId);

    const sessionId = createSessionId('analyze');
    analysisSessions.set(sessionId, { ...context, _ownerUserId: req.user?.uid || null });

    setTimeout(() => analysisSessions.delete(sessionId), 10 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/analyze/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const context = analysisSessions.get(sessionId);

  if (!context) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const stopHeartbeat = openSseStream(req, res);

  try {
    for await (const event of streamAnalysis(context)) {
      if (req.destroyed || res.writableEnded) break;
      if (event.type === 'log') {
        const ok = safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: event.message })}\n\n`);
        if (!ok) break;
      } else if (event.type === 'complete') {
        if (context.companyId) {
          await updateCompanyIfAllowed(context.companyId, ownerUserId(req, context), {
            business: context.business,
            analysis: event.analysis,
            socialScrapes: context.socialScrapes || [],
            step: 'analyzed',
          });
        }

        safeWrite(res, req, `data: ${JSON.stringify({
          type: 'complete',
          analysis: event.analysis,
          mock: event.mock ?? false,
          mockReason: event.mockReason || null,
        })}\n\n`);
      }
    }
  } catch (err) {
    if (!req.destroyed && !res.writableEnded) {
      safeWrite(res, req, `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    }
  } finally {
    stopHeartbeat();
    analysisSessions.delete(sessionId);
    res.end();
  }
});

app.post('/api/benchmark', agentRateLimit, async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.analysis) {
      return res.status(400).json({ error: 'Business and analysis required' });
    }
    await guardCompanyWrite(req, context.companyId);

    const result = await benchmarkAgent(context);
    if (context.companyId) {
      await updateCompanyIfAllowed(context.companyId, req.user?.uid || null, {
        business: context.business,
        analysis: context.analysis,
        competitors: result.competitors,
        step: 'benchmarked',
      });
    }
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/benchmark/session', agentRateLimit, async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.analysis) {
      return res.status(400).json({ error: 'Business and analysis required' });
    }
    await guardCompanyWrite(req, context.companyId);

    const sessionId = createSessionId('benchmark');
    benchmarkSessions.set(sessionId, { ...context, _ownerUserId: req.user?.uid || null });

    setTimeout(() => benchmarkSessions.delete(sessionId), 10 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/benchmark/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const context = benchmarkSessions.get(sessionId);

  if (!context) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const stopHeartbeat = openSseStream(req, res);

  try {
    for await (const event of streamBenchmark(context)) {
      if (req.destroyed || res.writableEnded) break;
      if (event.type === 'log') {
        const ok = safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: event.message })}\n\n`);
        if (!ok) break;
      } else if (event.type === 'complete') {
        if (context.companyId) {
          await updateCompanyIfAllowed(context.companyId, ownerUserId(req, context), {
            business: context.business,
            analysis: context.analysis,
            competitors: event.competitors,
            step: 'benchmarked',
          });
        }
        safeWrite(res, req, `data: ${JSON.stringify({
          type: 'complete',
          competitors: event.competitors,
          mock: event.mock ?? false,
          mockReason: event.mockReason || null,
        })}\n\n`);
      } else if (event.type === 'error') {
        safeWrite(res, req, `data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`);
      }
    }
  } catch (err) {
    if (!req.destroyed && !res.writableEnded) {
      safeWrite(res, req, `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    }
  } finally {
    stopHeartbeat();
    benchmarkSessions.delete(sessionId);
    res.end();
  }
});

app.post('/api/gap', agentRateLimit, async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.competitors) {
      return res.status(400).json({ error: 'Business and competitors required' });
    }
    await guardCompanyWrite(req, context.companyId);

    const result = await gapAgent(context);
    if (context.companyId) {
      await updateCompanyIfAllowed(context.companyId, req.user?.uid || null, {
        business: context.business,
        analysis: context.analysis,
        competitors: context.competitors,
        gaps: result.gaps,
        recommendedGap: result.recommendedGap,
        step: 'gap_analyzed',
      });
    }
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/gap/session', agentRateLimit, async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.competitors) {
      return res.status(400).json({ error: 'Business and competitors required' });
    }
    await guardCompanyWrite(req, context.companyId);

    const sessionId = createSessionId('gap');
    gapSessions.set(sessionId, { ...context, _ownerUserId: req.user?.uid || null });

    setTimeout(() => gapSessions.delete(sessionId), 10 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/gap/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const context = gapSessions.get(sessionId);

  if (!context) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const stopHeartbeat = openSseStream(req, res);

  try {
    for await (const event of streamGaps(context)) {
      if (req.destroyed || res.writableEnded) break;
      if (event.type === 'log') {
        const ok = safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: event.message })}\n\n`);
        if (!ok) break;
      } else if (event.type === 'complete') {
        if (context.companyId) {
          await updateCompanyIfAllowed(context.companyId, ownerUserId(req, context), {
            business: context.business,
            analysis: context.analysis,
            competitors: context.competitors,
            gaps: event.gaps,
            recommendedGap: event.recommendedGap,
            step: 'gap_analyzed',
          });
        }

        safeWrite(res, req, `data: ${JSON.stringify({
          type: 'complete',
          gaps: event.gaps,
          recommendedGap: event.recommendedGap,
          mock: event.mock ?? false,
          mockReason: event.mockReason || null,
        })}\n\n`);
      }
    }
  } catch (err) {
    if (!req.destroyed && !res.writableEnded) {
      safeWrite(res, req, `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    }
  } finally {
    stopHeartbeat();
    gapSessions.delete(sessionId);
    res.end();
  }
});

app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const items = await listCompaniesForUser(req.user.uid);
    res.json({ items });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/companies/:companyId', requireAuth, async (req, res) => {
  try {
    const company = await getCompanyForUser(req.params.companyId, req.user.uid);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/credits', requireAuth, async (req, res) => {
  try {
    const credits = await getOrCreateUserCredits(req.user.uid, req.user.email);
    res.json({
      ...credits,
      freeScanCount: FREE_SCAN_COUNT,
      packs: SCAN_PACKS,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/credits/purchase', requireAuth, async (req, res) => {
  try {
    const { packId } = req.body;
    if (!packId) return res.status(400).json({ error: 'packId is required' });

    const result = await purchaseScanPack(req.user.uid, packId, req.user.email);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      ...result,
      demo: true,
      message: 'Scans added to your account. Connect Stripe for live payments.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/leads/session', agentRateLimit, async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.gaps) {
      return res.status(400).json({ error: 'Business and gaps required' });
    }
    await guardCompanyWrite(req, context.companyId);

    const sessionId = createSessionId('leads');
    leadSessions.set(sessionId, { ...context, _ownerUserId: req.user?.uid || null });

    if (context.companyId) {
      await updateCompanyIfAllowed(context.companyId, req.user?.uid || null, {
        business: context.business,
        analysis: context.analysis,
        competitors: context.competitors,
        gaps: context.gaps,
        recommendedGap: context.recommendedGap,
        step: 'generating_leads',
      });
    }

    setTimeout(() => leadSessions.delete(sessionId), 30 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/leads/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const context = leadSessions.get(sessionId);

  if (!context) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  const stopHeartbeat = openSseStream(req, res);

  safeWrite(res, req, `data: ${JSON.stringify({ type: 'start', message: 'Lead generation started' })}\n\n`);

  try {
    for await (const event of streamLeads(context)) {
      if (req.destroyed || res.writableEnded) break;
      if (event.type === 'log') {
        safeWrite(res, req, `data: ${JSON.stringify({ type: 'log', message: event.message })}\n\n`);
      } else if (event.type === 'complete') {
        const leads = event.leads || [];

        if (context.companyId) {
          await updateCompanyIfAllowed(context.companyId, ownerUserId(req, context), {
            leads,
            step: 'leads_generated',
          });
        }

        safeWrite(res, req, `data: ${JSON.stringify({ type: 'complete', leads, message: 'All leads processed' })}\n\n`);
      }
    }
  } catch (err) {
    if (!req.destroyed && !res.writableEnded) {
      safeWrite(res, req, `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    }
  } finally {
    stopHeartbeat();
    leadSessions.delete(sessionId);
    res.end();
  }
});

app.post('/api/send-email', requireAuth, emailRateLimit, async (req, res) => {
  try {
    const { to, subject, body, from } = req.body;
    if (!to || !body) return res.status(400).json({ error: 'Recipient and body required' });
    if (!isValidEmail(to)) return res.status(400).json({ error: 'Invalid recipient email address' });
    if (String(body).length > 10000) {
      return res.status(400).json({ error: 'Email body is too long' });
    }

    const result = await sendEmail({
      to,
      subject: subject || 'Quick question about your business',
      body,
      from,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

const frontendDist = path.join(rootDir, 'frontend', 'dist');
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HookLine running on port ${PORT}`);
});

// Trigger reload for dotenv


