import { useEffect, useRef } from 'react';

export default function ActivityLog({ logs, title = 'Agent activity' }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  if (!logs.length) return null;

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h3>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {logs.map((log, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1 flex-shrink-0">
              {i === logs.length - 1 ? (
                <svg className="animate-spin h-3.5 w-3.5 text-hookline-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span>{log}</span>
          </li>
        ))}
        <li ref={endRef} />
      </ul>
    </div>
  );
}
