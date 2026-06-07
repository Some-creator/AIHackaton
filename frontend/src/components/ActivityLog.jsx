import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ActivityLog({ logs, title = 'In progress', loading = true, finishing = false }) {
  const endRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const expectedLogSteps = (() => {
    const t = title.toLowerCase();
    if (t.includes('benchmark')) return 8;
    if (t.includes('reading') || t.includes('ingest')) return 9;
    if (t.includes('gap')) return 6;
    if (t.includes('lead')) return 10;
    return 7;
  })();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const isActive = loading && !finishing;
  const displayLogs = logs.length > 0 ? logs : (loading ? ['Getting started...'] : []);

  if (!displayLogs.length) return null;
  const logProgress = logs.length > 0
    ? Math.min(Math.round((logs.length / expectedLogSteps) * 92), 92)
    : 8;
  const progress = finishing ? 100 : isActive ? logProgress : 100;

  return (
    <div
      className="mt-6 rounded-xl border overflow-hidden transition-colors duration-300 backdrop-blur-md"
      style={{
        backgroundColor: 'hsl(var(--terminal-bg))',
        borderColor: 'hsl(var(--terminal-border))',
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b transition-colors duration-300"
        style={{
          backgroundColor: 'hsl(var(--terminal-header-bg))',
          borderColor: 'hsl(var(--terminal-border))',
        }}
      >
        <div className="flex gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-red-500/70' : 'bg-red-400/80'}`} />
          <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-yellow-500/70' : 'bg-amber-400/80'}`} />
          <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-green-500/70' : 'bg-emerald-400/80'}`} />
        </div>
        <span
          className="text-xs font-mono font-semibold ml-1 uppercase tracking-widest transition-colors duration-300"
          style={{ color: 'hsl(var(--terminal-title))' }}
        >
          {title}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hookline-500 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-hookline-500' : 'bg-hookline-500/50'}`} />
          </span>
          <span className={`text-xs font-mono ${isActive ? 'text-hookline-500' : 'text-hookline-500/60'}`}>
            {isActive ? 'live' : 'done'}
          </span>
        </div>
      </div>

      {(loading || finishing) && (
        <div
          className="w-full h-1 transition-colors duration-300"
          style={{ backgroundColor: 'hsl(var(--terminal-progress-track))' }}
        >
          <div
            className="h-full bg-hookline-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <ul className="activity-log-scroll space-y-0 max-h-52 overflow-y-auto p-3 font-mono text-xs">
        {displayLogs.map((log, i) => {
          const isLast = i === displayLogs.length - 1;
          const isCurrent = isLast && isActive;

          return (
            <li
              key={i}
              className="flex items-start gap-2.5 py-1 px-1 rounded transition-colors duration-300"
              style={isCurrent ? { backgroundColor: 'hsl(var(--terminal-active-bg))' } : undefined}
            >
              <span className="mt-0.5 flex-shrink-0 w-3.5 flex justify-center">
                {isCurrent ? (
                  <svg className="animate-spin h-3 w-3 text-hookline-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg
                    className={`h-3 w-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>

              <span className="text-hookline-500/50 select-none flex-shrink-0">›</span>

              <span
                className="transition-colors duration-300"
                style={{ color: isCurrent ? 'hsl(var(--terminal-active-text))' : 'hsl(var(--terminal-text-muted))' }}
              >
                {log}
              </span>

              {isCurrent && (
                <span className="inline-block w-1.5 h-3.5 bg-hookline-500 ml-0.5 animate-pulse flex-shrink-0 self-center rounded-sm" />
              )}
            </li>
          );
        })}
        <li ref={endRef} />
      </ul>
    </div>
  );
}
