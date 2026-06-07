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

async function parseFailedResponse(res) {
  const err = await res.json().catch(() => ({}));
  if (err.error) return new Error(err.error);
  if (res.status >= 500) {
    return new Error(
      'Backend unavailable — run npm run dev:backend in a separate terminal (port 3001), then try again.',
    );
  }
  return new Error(`Request failed: ${res.status}`);
}

async function post(endpoint, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Could not reach the backend — run npm run dev:backend in a separate terminal (port 3001).',
    );
  }
  if (!res.ok) {
    throw await parseFailedResponse(res);
  }
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function listHistory() {
  const res = await fetch(`${API_BASE}/history`, { headers: await authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function getCompany(companyId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}`, { headers: await authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteCompany(companyId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function getCredits() {
  let res;
  try {
    res = await fetch(`${API_BASE}/credits`, { headers: await authHeaders() });
  } catch {
    throw new Error(
      'Could not reach the backend — run npm run dev:backend in a separate terminal (port 3001).',
    );
  }
  if (!res.ok) {
    throw await parseFailedResponse(res);
  }
  return res.json();
}

export async function purchaseScanPack(packId) {
  return post('/credits/purchase', { packId });
}

export async function ingest(url, socialProfiles = []) {
  return post('/ingest', { url, socialProfiles });
}

export async function createIngestSession(url, socialProfiles = []) {
  const res = await fetch(`${API_BASE}/ingest/session`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ url, socialProfiles }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 402) {
    const err = new Error(body.error || 'No scans remaining');
    err.code = 'NO_SCANS';
    err.scansRemaining = body.scansRemaining ?? 0;
    throw err;
  }
  if (!res.ok) {
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return body;
}

export function streamIngest(sessionId, { onLog, onComplete, onError }) {
  const eventSource = new EventSource(`${API_BASE}/ingest/stream/${sessionId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'log') onLog?.(data.message);
    else if (data.type === 'complete') {
      onComplete?.(data);
      eventSource.close();
    } else if (data.type === 'error') {
      onError?.(new Error(data.error));
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error('Connection to ingestion stream lost'));
    eventSource.close();
  };

  return eventSource;
}

export async function analyze(context) {
  return post('/analyze', context);
}

export async function createAnalysisSession(context) {
  return post('/analyze/session', context);
}

export function streamAnalysis(sessionId, { onLog, onComplete, onError }) {
  const eventSource = new EventSource(`${API_BASE}/analyze/stream/${sessionId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'log') onLog?.(data.message);
    else if (data.type === 'complete') {
      onComplete?.(data);
      eventSource.close();
    } else if (data.type === 'error') {
      onError?.(new Error(data.error));
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error('Connection to analysis stream lost'));
    eventSource.close();
  };

  return eventSource;
}

export async function benchmark(context) {
  return post('/benchmark', context);
}

export async function createBenchmarkSession(context) {
  return post('/benchmark/session', context);
}

export function streamBenchmark(sessionId, { onLog, onComplete, onError }) {
  const eventSource = new EventSource(`${API_BASE}/benchmark/stream/${sessionId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'log') onLog?.(data.message);
    else if (data.type === 'complete') {
      onComplete?.(data);
      eventSource.close();
    } else if (data.type === 'error') {
      onError?.(new Error(data.error));
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error('Connection to benchmark stream lost'));
    eventSource.close();
  };

  return eventSource;
}

export async function findGaps(context) {
  return post('/gap', context);
}

export async function createGapSession(context) {
  return post('/gap/session', context);
}

export function streamGaps(sessionId, { onLog, onComplete, onError }) {
  const eventSource = new EventSource(`${API_BASE}/gap/stream/${sessionId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'log') onLog?.(data.message);
    else if (data.type === 'complete') {
      onComplete?.(data);
      eventSource.close();
    } else if (data.type === 'error') {
      onError?.(new Error(data.error));
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    onError?.(new Error('Connection to gap stream lost'));
    eventSource.close();
  };

  return eventSource;
}

export async function createLeadSession(context) {
  return post('/leads/session', context);
}

export function streamLeads(sessionId, { onLog, onComplete, onError }) {
  const eventSource = new EventSource(`${API_BASE}/leads/stream/${sessionId}`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'log') onLog?.(data.message);
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
