import { useEffect, useState } from 'react';
import { Globe, Clock, MapPin, Users, ChevronRight, LayoutDashboard, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import * as api from '../api';
import { getMockHistory } from '../lib/mockHistory';

const STEP_LABELS = {
  ingesting: 'Analyzing',
  ingested: 'Profile ready',
  analyzed: 'Analysis done',
  benchmarked: 'Benchmarked',
  gap_analyzed: 'Gaps found',
  generating_leads: 'Finding leads',
  leads_generated: 'Leads ready',
  unknown: 'In progress',
};

function formatDate(iso) {
  if (!iso) return 'Unknown date';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatUrl(url) {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return url || 'Unknown site';
  }
}

export default function Dashboard({ user, onOpenRun, onNewAnalysis, onBack }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (user?.uid) {
          const { items: remote } = await api.listHistory();
          if (!cancelled) setItems(remote || []);
        } else {
          if (!cancelled) setItems(getMockHistory());
        }
      } catch (err) {
        if (!cancelled) {
          if (user?.uid) {
            setError(err.message || 'Could not load history');
          } else {
            setItems(getMockHistory());
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.uid]);

  return (
    <div className="relative max-w-4xl mx-auto">
      <div className="mb-8 animate-rise">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Your workspace</p>
            <h1 className={`font-section-title text-3xl sm:text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Dashboard
            </h1>
            <p className={`mt-2 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
              Pick up where you left off or start a new analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewAnalysis}
            className="btn-primary shrink-0 px-6 py-3 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            New analysis
          </button>
        </div>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={`mb-6 text-sm font-semibold transition ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          ← Back to home
        </button>
      )}

      {loading && (
        <div className={`rounded-2xl border p-10 text-center ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-hookline-500 border-t-transparent" />
          <p className={`mt-4 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Loading your history…</p>
        </div>
      )}

      {!loading && error && (
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-red-950/20 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={`rounded-[1.75rem] border p-10 text-center ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-200'}`}>
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? 'bg-hookline-500/15 text-hookline-300' : 'bg-hookline-50 text-hookline-600'}`}>
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <h2 className={`font-section-title text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No analyses yet</h2>
          <p className={`mb-6 max-w-sm mx-auto text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            Run your first website through HookLine and it will show up here automatically.
          </p>
          <button type="button" onClick={onNewAnalysis} className="btn-primary px-6 py-3 rounded-xl text-sm">
            Analyze a website
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3 animate-rise">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpenRun(item.id)}
                className={`card-lift group w-full text-left rounded-2xl border p-5 transition-all ${
                  isDark
                    ? 'bg-zinc-900/60 border-zinc-800 hover:border-hookline-500/40'
                    : 'bg-white border-gray-200 hover:border-hookline-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isDark ? 'bg-hookline-500/15 text-hookline-300' : 'bg-hookline-50 text-hookline-700'
                      }`}>
                        {STEP_LABELS[item.step] || STEP_LABELS.unknown}
                      </span>
                      {item.leadCount > 0 && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                          <Users className="w-3.5 h-3.5" />
                          {item.leadCount} leads
                        </span>
                      )}
                    </div>
                    <h3 className={`font-section-title text-lg truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.businessName || formatUrl(item.url)}
                    </h3>
                    <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      <span className="inline-flex items-center gap-1.5 truncate max-w-full">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        {formatUrl(item.url)}
                      </span>
                      {item.location && item.location !== 'Unknown' && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {item.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {formatDate(item.updatedAt || item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5 ${isDark ? 'text-zinc-500 group-hover:text-hookline-300' : 'text-gray-400 group-hover:text-hookline-600'}`} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!user?.uid && !loading && items.length > 0 && (
        <p className={`mt-4 text-xs text-center ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          Demo mode — history is saved locally in this browser only. Sign in to sync across devices.
        </p>
      )}
    </div>
  );
}
