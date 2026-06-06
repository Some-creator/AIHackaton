import { auth } from './lib/firebase';

const API_BASE = '/api';

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (auth?.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function post(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function ingest(url, socialProfiles = []) {
  return post('/ingest', { url, socialProfiles });
}

export async function analyze(context) {
  return post('/analyze', context);
}

export async function benchmark(context) {
  return post('/benchmark', context);
}

export async function findGaps(context) {
  return post('/gap', context);
}

export async function createLeadSession(context) {
  return post('/leads/session', context);
}

export function streamLeads(sessionId, { onLead, onComplete, onError, onStart }) {
  const eventSource = new EventSource(`${API_BASE}/leads/stream/${sessionId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'start') onStart?.(data);
    else if (data.type === 'lead') onLead?.(data.lead);
    else if (data.type === 'complete') {
      onComplete?.(data);
      eventSource.close();
    } else if (data.type === 'error') {
      onError?.(new Error(data.error));
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error('Connection to lead stream lost'));
    eventSource.close();
  };

  return eventSource;
}

export async function sendEmail({ to, subject, body }) {
  return post('/send-email', { to, subject, body });
}
