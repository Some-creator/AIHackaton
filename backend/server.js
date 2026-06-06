import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ingestionAgent } from '../agents/ingestionAgent.js';
import { analysisAgent } from '../agents/analysisAgent.js';
import { benchmarkAgent } from '../agents/benchmarkAgent.js';
import { gapAgent } from '../agents/gapAgent.js';
import { streamLeads } from '../agents/leadAgent.js';
import { sendEmail } from './sendgrid.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

const leadSessions = new Map();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hookline-backend' });
});

app.post('/api/ingest', async (req, res) => {
  try {
    const { url, socialProfiles = [] } = req.body;
    if (!url) return res.status(400).json({ error: 'Website URL is required' });

    const result = await ingestionAgent(url, socialProfiles);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const context = req.body;
    if (!context.business) return res.status(400).json({ error: 'Business profile required' });

    const result = await analysisAgent(context);
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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gap', async (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.competitors) {
      return res.status(400).json({ error: 'Business and competitors required' });
    }

    const result = await gapAgent(context);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/session', (req, res) => {
  try {
    const context = req.body;
    if (!context.business || !context.gaps) {
      return res.status(400).json({ error: 'Business and gaps required' });
    }

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    leadSessions.set(sessionId, context);

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
    for await (const lead of streamLeads(context)) {
      res.write(`data: ${JSON.stringify({ type: 'lead', lead })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: 'complete', message: 'All leads processed' })}\n\n`);
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

app.listen(PORT, () => {
  console.log(`HookLine backend running on http://localhost:${PORT}`);
});
