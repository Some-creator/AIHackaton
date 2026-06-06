import { useTheme } from '../context/ThemeContext';
import StepNavigation from './StepNavigation';

const competitionColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

export default function MarketGap({ gaps, recommendedGap, onConfirm, loading, onBack, backLabel, onNext, nextLabel, navDisabled }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const primary = gaps[recommendedGap ?? 0];

  return (
    <div className="max-w-3xl mx-auto">
      <StepNavigation
        onBack={onBack}
        backLabel={backLabel}
        onNext={onNext}
        nextLabel={nextLabel}
        backDisabled={navDisabled}
        nextDisabled={navDisabled}
      />
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Market Gap Analysis</h2>
        <p className={`mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          Niches your competitors are ignoring — ranked by opportunity.
        </p>
      </div>

      <div className={`rounded-2xl shadow-lg border-2 border-hookline-500 p-8 mb-6 transition-all duration-300 ${isDark ? 'bg-zinc-900/60 backdrop-blur-md' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-hookline-100 text-hookline-700 dark:bg-hookline-900/40 dark:text-hookline-300 text-xs font-bold uppercase rounded-full">
            Top Opportunity
          </span>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${competitionColors[primary.competitionLevel]}`}>
            {primary.competitionLevel} competition
          </span>
        </div>

        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{primary.niche}</h3>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Why demand exists</h4>
            <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>{primary.demand}</p>
          </div>
          <div>
            <h4 className={`font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>The opportunity</h4>
            <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>{primary.opportunity}</p>
          </div>
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-hookline-950/20 border-hookline-900/40 text-hookline-300' : 'bg-hookline-50 border-hookline-100 text-hookline-900'}`}>
            <h4 className={`font-bold mb-1 ${isDark ? 'text-hookline-400' : 'text-hookline-700'}`}>Ideal lead profile</h4>
            <p className="leading-relaxed">{primary.recommendedTarget}</p>
          </div>
        </div>
      </div>

      {gaps.length > 1 && (
        <div className="mb-8">
          <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Other gaps identified</h3>
          <div className="space-y-3">
            {gaps.map((gap, i) => {
              if (i === (recommendedGap ?? 0)) return null;
              return (
                <div key={i} className={`rounded-xl border p-4 transition-all duration-300 ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${competitionColors[gap.competitionLevel]}`}>
                      {gap.competitionLevel}
                    </span>
                  </div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{gap.niche}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => onConfirm(recommendedGap ?? 0)}
        disabled={loading}
        className="w-full md:w-auto px-8 py-3.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating leads...
          </>
        ) : (
          'Confirm Target & Generate Leads'
        )}
      </button>
    </div>
  );
}
