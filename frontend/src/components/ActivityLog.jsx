import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ActivityLog({ logs, title = 'Agent activity', loading = true, finishing = false }) {
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
  const displayLogs = logs.length > 0 ? logs : (loading ? ['Connecting to agent...'] : []);

  if (!displayLogs.length) return null;
  const logProgress = logs.length > 0
    ? Math.min(Math.round((logs.length / expectedLogSteps) * 92), 92)
    : 8;
  const progress = finishing ? 100 : isActive ? logProgress : 100;

  return (
    <div className={`mt-6 rounded-xl border overflow-hidden transition-all duration-300 ${
      isDark
        ? 'bg-zinc-950 border-zinc-800'
        : 'bg-slate-900 border-slate-700'
    }`}>
      {/* Terminal header bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${
        isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-slate-700 bg-slate-800'
      }`}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs font-mono font-semibold text-slate-400 ml-1 uppercase tracking-widest">
          {title}
        </span>
        {/* live pulse dot on the right */}
        <div className="ml-auto flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 bg-emerald-500`}></span>
          </span>
          <span className={`text-xs font-mono ${isActive ? 'text-emerald-400' : 'text-emerald-500/60'}`}>
            {isActive ? 'live' : 'done'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {(loading || finishing) && (
        <div className="w-full h-1 bg-zinc-800/50 dark:bg-zinc-900/40">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Log lines */}
      <ul className="space-y-0 max-h-52 overflow-y-auto p-3 font-mono text-xs">
        {displayLogs.map((log, i) => {
          const isLast = i === displayLogs.length - 1;
          return (
            <li key={i} className={`flex items-start gap-2.5 py-1 px-1 rounded transition-colors ${
              isLast && isActive ? 'bg-hookline-500/10' : ''
            }`}>
              {/* Icon */}
              <span className="mt-0.5 flex-shrink-0 w-3.5 flex justify-center">
                {isLast && isActive ? (
                  <svg className="animate-spin h-3 w-3 text-hookline-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>

              {/* Prompt prefix */}
              <span className="text-hookline-500/60 select-none flex-shrink-0">›</span>

              {/* Log text */}
              <span className={isLast && isActive ? 'text-hookline-300' : 'text-slate-400'}>
                {log}
              </span>

              {/* Blinking cursor on last line */}
              {isLast && isActive && (
                <span className="inline-block w-1.5 h-3.5 bg-hookline-400 ml-0.5 animate-pulse flex-shrink-0 self-center rounded-sm" />
              )}
            </li>
          );
        })}
        <li ref={endRef} />
      </ul>
    </div>
  );
}
