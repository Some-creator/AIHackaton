import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { ingestionAgent, streamIngestion } from '../agents/ingestionAgent.js';
import { analysisAgent } from '../agents/analysisAgent.js';
import { benchmarkAgent, streamBenchmark } from '../agents/benchmarkAgent.js';
import { gapAgent } from '../agents/gapAgent.js';
import { streamLeads } from '../agents/leadAgent.js';
import { sendEmail } from './sendgrid.js';
import { createCompany, updateCompany, getCompany, initFirebase, getFirebaseStatus } from './firebase.js';

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

app.use(cors());
app.use(express.json());

initFirebase();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hookline-backend', firebase: getFirebaseStatus() });
});

app.post('/api/ingest', async (req, res) => {
  try {
    const { url, socialProfiles = [] } = req.body;
    if (!url) return res.status(400).json({ error: 'Website URL is required' });

    const result = await ingestionAgent(url, socialProfiles);
    const { id: companyId, saved, error: saveError } = await createCompany({
      url,
      socialProfiles,
      business: result.business,
      socialScrapes: result.socialScrapes || [],
      step: 'ingested',
      mock: result.mock ?? false,
    });

    res.json({ ...result, companyId, saved, saveError });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ingest/session', (req, res) => {
  try {
    const { url, socialProfiles = [] } = req.body;
    if (!url) return res.status(400).json({ error: 'Website URL is required' });

    const sessionId = `ingest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    ingestSessions.set(sessionId, { url, socialProfiles });

    setTimeout(() => ingestSessions.delete(sessionId), 10 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ingest/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = ingestSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  let companyId = null;

  try {
    const initialSave = await createCompany({
      url: session.url,
      socialProfiles: session.socialProfiles,
      step: 'ingesting',
      ingestStartedAt: new Date().toISOString(),
    });
    companyId = initialSave.id;

    if (initialSave.saved) {
      res.write(`data: ${JSON.stringify({ type: 'log', message: `Database record created (${companyId})` })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'log', message: `Warning: could not save to database — ${initialSave.error || 'Firebase not configured'}` })}\n\n`);
    }

    for await (const event of streamIngestion(session.url, session.socialProfiles)) {
      if (event.type === 'log') {
        res.write(`data: ${JSON.stringify({ type: 'log', message: event.message })}\n\n`);
      } else if (event.type === 'complete') {
        res.write(`data: ${JSON.stringify({ type: 'log', message: 'Saving your profile...' })}\n\n`);

        let saved = false;
        let saveError = null;

        if (companyId) {
          const update = await updateCompany(companyId, {
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
          });
          companyId = created.id;
          saved = created.saved;
          saveError = created.error;
        }

        if (!saved) {
          res.write(`data: ${JSON.stringify({ type: 'log', message: `Warning: profile not saved to database — ${saveError || 'unknown error'}` })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({
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
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
  } finally {
    ingestSessions.delete(sessionId);
    res.end();
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const context = req.body;
    if (!context.business) return res.status(400).json({ error: 'Business profile required' });

    const result = await analysisAgent(context);
    if (context.companyId) {
      await updateCompany(context.companyId, {
        business: context.business,
        analysis: result.analysis,
        socialScrapes: context.socialScrapes || [],
        step: 'analyzed',
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/benchmark', async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.analysis) {
      return res.status(400).json({ error: 'Business and analysis required' });
    }

    const result = await benchmarkAgent(context);
    if (context.companyId) {
      await updateCompany(context.companyId, {
        business: context.business,
        analysis: context.analysis,
        competitors: result.competitors,
        step: 'benchmarked',
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/benchmark/session', (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.analysis) {
      return res.status(400).json({ error: 'Business and analysis required' });
    }

    const sessionId = `benchmark-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    benchmarkSessions.set(sessionId, context);

    setTimeout(() => benchmarkSessions.delete(sessionId), 10 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/benchmark/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const context = benchmarkSessions.get(sessionId);

  if (!context) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    for await (const event of streamBenchmark(context)) {
      if (event.type === 'log') {
        res.write(`data: ${JSON.stringify({ type: 'log', message: event.message })}\n\n`);
      } else if (event.type === 'complete') {
        if (context.companyId) {
          await updateCompany(context.companyId, {
            business: context.business,
            analysis: context.analysis,
            competitors: event.competitors,
            step: 'benchmarked',
          });
        }

        res.write(`data: ${JSON.stringify({
          type: 'complete',
          competitors: event.competitors,
          mock: event.mock ?? false,
        })}\n\n`);
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
  } finally {
    benchmarkSessions.delete(sessionId);
    res.end();
  }
});

app.post('/api/gap', async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.competitors) {
      return res.status(400).json({ error: 'Business and competitors required' });
    }

    const result = await gapAgent(context);
    if (context.companyId) {
      await updateCompany(context.companyId, {
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/companies/:companyId', async (req, res) => {
  try {
    const company = await getCompany(req.params.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/session', async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.gaps) {
      return res.status(400).json({ error: 'Business and gaps required' });
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    leadSessions.set(sessionId, context);

    if (context.companyId) {
      await updateCompany(context.companyId, {
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/stream/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const context = leadSessions.get(sessionId);

  if (!context) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'start', message: 'Lead generation started' })}\n\n`);

  try {
    const leads = [];
    for await (const lead of streamLeads(context)) {
      leads.push(lead);
      res.write(`data: ${JSON.stringify({ type: 'lead', lead })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'complete', message: 'All leads processed' })}\n\n`);

    if (context.companyId) {
      await updateCompany(context.companyId, {
        leads,
        step: 'leads_generated',
      });
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
  } finally {
    leadSessions.delete(sessionId);
    res.end();
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body, from } = req.body;
    if (!to || !body) return res.status(400).json({ error: 'Recipient and body required' });

    const result = await sendEmail({
      to,
      subject: subject || 'Quick question about your business',
      body,
      from,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

