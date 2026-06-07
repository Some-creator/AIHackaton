/** Quick SSE ingest test — same URLs as the stuck UI session */
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');
if (existsSync(envPath)) dotenv.config({ path: envPath });

const BASE = process.env.API_BASE || 'http://localhost:3001/api';
const URL =
  'https://kahfe.square.site/?utm_source=ig&utm_medium=social&utm_content=link_in_bio';
const SOCIAL = ['https://www.instagram.com/the.kahfe/'];

async function main() {
  console.log('Creating session...');
  const t0 = Date.now();
  const sessionRes = await fetch(`${BASE}/ingest/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: URL, socialProfiles: SOCIAL }),
  });
  const { sessionId } = await sessionRes.json();
  console.log(`Session ${sessionId} in ${Date.now() - t0}ms`);

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
  let firstLogAt = null;

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
      const elapsed = Date.now() - t0;
      if (data.type === 'log' && firstLogAt === null) firstLogAt = elapsed;
      console.log(`[+${elapsed}ms]`, data.type, data.message || data.error || '');
      if (data.type === 'complete' || data.type === 'error') {
        console.log('\nDone in', elapsed, 'ms');
        if (firstLogAt !== null) console.log('First log at', firstLogAt, 'ms');
        process.exit(data.type === 'complete' ? 0 : 1);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
