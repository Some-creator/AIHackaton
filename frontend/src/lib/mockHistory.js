const STORAGE_KEY = 'hookline_mock_history';
const MAX_ITEMS = 50;

export function getMockHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function appendMockHistory(entry) {
  const items = getMockHistory().filter((item) => item.id !== entry.id);
  items.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function removeMockHistory(id) {
  const items = getMockHistory().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getMockCompany(id) {
  return getMockHistory().find((item) => item.id === id)?.fullRecord || null;
}

export function buildMockHistoryEntry({ companyId, url, business, step, context, leads }) {
  const now = new Date().toISOString();
  return {
    id: companyId || `mock-${Date.now()}`,
    url: url || business?.website || '',
    step: step || 'ingested',
    businessName: business?.name || null,
    location: business?.location || null,
    leadCount: Array.isArray(leads) ? leads.length : 0,
    createdAt: now,
    updatedAt: now,
    fullRecord: {
      id: companyId || `mock-${Date.now()}`,
      url,
      business,
      step,
      ...context,
      leads: leads || [],
    },
  };
}
