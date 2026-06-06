import { useTheme } from '../context/ThemeContext';
import ActivityLog from './ActivityLog';
import StepNavigation from './StepNavigation';

export default function CompetitorBenchmark({ competitors, mock = false, mockReason, onContinue, loading, gapLogs = [], onBack, backLabel, onNext, nextLabel, navDisabled }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="max-w-5xl mx-auto">
      <StepNavigation
        onBack={onBack}
        backLabel={backLabel}
        onNext={onNext}
        nextLabel={nextLabel}
        backDisabled={navDisabled}
        nextDisabled={navDisabled}
      />
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Competitor Benchmark</h2>
        <p className={`mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          How you stack up against similar businesses in your market.
        </p>
        {mock && (
          <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
            isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <span className="font-semibold">Demo competitors</span>
            {' — '}
            {mockReason || 'live search unavailable'}
            {mockReason?.includes('GOOGLE_PLACES') && (
              <span className="block mt-1 text-xs opacity-80">
                Add <code className="font-mono">GOOGLE_PLACES_API_KEY</code> in Railway variables and enable Places API (New) in Google Cloud.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {competitors.map((comp, i) => (
          <div key={i} className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{comp.name}</h3>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{comp.targetMarket}</p>
              </div>
              {comp.website && (
                <a
                  href={comp.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-hookline-500 hover:text-hookline-600 text-sm font-semibold"
                >
                  Visit
                </a>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>Their Strengths</h4>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                  {comp.strengths.map((s, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-green-500 font-bold">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Their Weaknesses</h4>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                  {comp.weaknesses.map((w, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-red-400 font-bold">-</span> {w}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`rounded-lg p-3 border ${isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                  They Have, You Don&apos;t
                </h4>
                <ul className="text-sm space-y-1">
                  {comp.theyHaveYouDont.map((item, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="opacity-60">·</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="mb-6">
          <ActivityLog logs={gapLogs} title="Agent 4 — Finding market gaps" />
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={loading}
        className="w-full md:w-auto px-8 py-3.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Finding market gaps...
          </>
        ) : (
          'Find Market Gaps'
        )}
      </button>
    </div>
  );
}
