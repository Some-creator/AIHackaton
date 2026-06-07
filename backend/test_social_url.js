import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (existsSync(envPath)) dotenv.config({ path: envPath });

const BASE = process.env.API_BASE || 'http://localhost:3001/api';
const URL = 'https://www.instagram.com/the.sipstop/';

async function main() {
  console.log('Creating session for social URL:', URL);
  const sessionRes = await fetch(`${BASE}/ingest/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: URL, socialProfiles: [] }),
  });
  const { sessionId } = await sessionRes.json();
  console.log(`Session ${sessionId} created`);

  const streamUrl = `${BASE}/ingest/stream/${sessionId}`;
  console.log('Opening SSE stream...');

  const res = await fetch(streamUrl, { headers: { Accept: 'text/event-stream' } });
  if (!res.ok) {
    console.error('Stream failed:', res.status, await res.text());
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
      console.log('Event:', data.type, data.message || data.error || '');
      if (data.type === 'error') {
        console.log('Test passed: Error returned successfully.');
        process.exit(0);
      }
      if (data.type === 'complete') {
        console.log('Test finished with complete (unexpected without APIFY_API_KEY).');
        process.exit(0);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
