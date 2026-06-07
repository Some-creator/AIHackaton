import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (existsSync(envPath)) dotenv.config({ path: envPath });

const BASE = process.env.API_BASE || 'http://localhost:3001/api';
const URL = 'https://kahfe.square.site/';

async function main() {
  console.log('Creating session for disconnect test...');
  const sessionRes = await fetch(`${BASE}/ingest/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: URL, socialProfiles: [] }),
  });
  const { sessionId } = await sessionRes.json();
  console.log(`Session ${sessionId} created`);

  const streamUrl = `${BASE}/ingest/stream/${sessionId}`;
  console.log('Opening SSE stream and will disconnect in 1.5 seconds...');

  const controller = new AbortController();
  const res = await fetch(streamUrl, {
    headers: { Accept: 'text/event-stream' },
    signal: controller.signal,
  });

  if (!res.ok) {
    console.error('Stream failed:', res.status, await res.text());
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  setTimeout(() => {
    console.log('Disconnecting client (aborting stream)...');
    controller.abort();
  }, 1500);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const line = part.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const data = JSON.parse(line.slice(6));
        console.log('Received:', data.type, data.message || '');
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Client successfully disconnected.');
      // Wait another 3 seconds to verify the backend server has not crashed and remains healthy.
      console.log('Waiting 3 seconds to check server health...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      try {
        const healthRes = await fetch(`${BASE}/health`);
        const health = await healthRes.json();
        console.log('Server health response:', health.status);
        if (health.status === 'ok') {
          console.log('Test passed: Server is healthy and did not crash after disconnect!');
          process.exit(0);
        }
      } catch (healthErr) {
        console.error('Server health check failed! Server might have crashed:', healthErr.message);
        process.exit(1);
      }
    } else {
      console.error('Unexpected error:', err);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
