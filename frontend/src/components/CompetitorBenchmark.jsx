import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ActivityLog from './ActivityLog';
import StepNavigation from './StepNavigation';
import PrimaryButton from './ui/PrimaryButton';

function CompetitorCard({ comp, isDark }) {
  return (
    <div className="surface-card p-6 sm:p-8 md:p-10 h-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h3 className={`font-section-title text-xl sm:text-2xl mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {comp.name}
          </h3>
          <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            {comp.targetMarket}
          </p>
        </div>
        {comp.website && (
          <a
            href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-hookline-500 hover:text-hookline-400 text-sm font-semibold"
          >
            Visit
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            Their Strengths
          </h4>
          <ul className={`text-sm sm:text-[15px] space-y-2.5 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
            {(comp.strengths || []).map((s, j) => (
              <li key={j} className="flex gap-2.5 leading-relaxed">
                <span className="text-green-500 font-bold shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
            Their Weaknesses
          </h4>
          <ul className={`text-sm sm:text-[15px] space-y-2.5 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
            {(comp.weaknesses || []).map((w, j) => (
              <li key={j} className="flex gap-2.5 leading-relaxed">
                <span className="text-red-400 font-bold shrink-0">-</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className={`mt-6 md:mt-8 rounded-xl p-4 sm:p-5 border ${
          isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <h4 className={`text-xs font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
          They Have, You Don&apos;t
        </h4>
        <ul className="text-sm sm:text-[15px] space-y-2">
          {(comp.theyHaveYouDont || []).map((item, j) => (
            <li key={j} className="flex gap-2.5 leading-relaxed">
              <span className="opacity-60 shrink-0">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CompetitorBenchmark({
  competitors,
  mock = false,
  mockReason,
  onContinue,
  loading,
  gapLogs = [],
  gapFinishing = false,
  onBack,
  backLabel,
  onNext,
  nextLabel,
  navDisabled,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeIndex, setActiveIndex] = useState(0);

  const total = competitors?.length ?? 0;
  const activeCompetitor = total > 0 ? competitors[activeIndex] : null;

  useEffect(() => {
    if (total === 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= total) {
      setActiveIndex(total - 1);
    }
  }, [total, activeIndex]);

  const goToPrevious = useCallback(
    (e) => {
      e?.preventDefault?.();
      setActiveIndex((i) => (i <= 0 ? i : i - 1));
    },
    [],
  );

  const goToNext = useCallback(
    (e) => {
      e?.preventDefault?.();
      setActiveIndex((i) => (i >= total - 1 ? i : i + 1));
    },
    [total],
  );

  const goToIndex = useCallback((index) => {
    if (index < 0 || index >= total || index === activeIndex) return;
    setActiveIndex(index);
  }, [total, activeIndex]);

  const atStart = activeIndex <= 0;
  const atEnd = activeIndex >= total - 1;

  const blockDisabledNavFocus = (e, blocked) => {
    if (blocked) e.preventDefault();
  };

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
      <div className="mb-8 animate-rise">
        <p className="eyebrow mb-2">Step 3 · Benchmark</p>
        <h2 className={`font-section-title text-2xl sm:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Competitor Benchmark
        </h2>
        <p className={`mt-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          How you stack up against similar businesses in your market.
        </p>
        {mock && (
          <div
            className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
              isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <span className="font-semibold">Demo competitors</span>
            {' — '}
            {mockReason || 'Live search is unavailable — showing sample data'}
          </div>
        )}
      </div>

      {activeCompetitor && (
        <div className="mb-8">
          {total > 1 && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 sm:px-5 sm:py-4 ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onMouseDown={(e) => blockDisabledNavFocus(e, atStart)}
                  onClick={goToPrevious}
                  aria-disabled={atStart}
                  aria-label="Previous competitor"
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
                    atStart
                      ? 'opacity-40 cursor-not-allowed'
                      : isDark
                        ? 'text-zinc-300 hover:bg-zinc-800'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </button>

                <div className="flex flex-col items-center gap-2 min-w-0 flex-1 px-2">
                  <p className={`text-sm sm:text-base font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Competitor {activeIndex + 1} of {total}
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    {competitors.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => goToIndex(i)}
                        aria-label={`Go to competitor ${i + 1}`}
                        aria-current={i === activeIndex ? 'true' : undefined}
                        className={`h-2 rounded-full transition-all ${
                          i === activeIndex
                            ? 'w-6 bg-hookline-500'
                            : `w-2 ${isDark ? 'bg-zinc-500 hover:bg-zinc-400' : 'bg-gray-400 hover:bg-gray-500'}`
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onMouseDown={(e) => blockDisabledNavFocus(e, atEnd)}
                  onClick={goToNext}
                  aria-disabled={atEnd}
                  aria-label="Next competitor"
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
                    atEnd
                      ? 'opacity-40 cursor-not-allowed'
                      : isDark
                        ? 'text-zinc-300 hover:bg-zinc-800'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <CompetitorCard comp={activeCompetitor} isDark={isDark} />
        </div>
      )}

      {(loading || gapFinishing) && (
        <div className="mb-6">
          <ActivityLog
            logs={gapLogs}
            title="Finding money on the table"
            loading={loading}
            finishing={gapFinishing}
          />
        </div>
      )}

      <PrimaryButton onClick={onContinue} loading={loading} loadingText="Finding market gaps...">
        Find Market Gaps
      </PrimaryButton>
    </div>
  );
}
