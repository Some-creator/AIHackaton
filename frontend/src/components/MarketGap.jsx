import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import StepNavigation from './StepNavigation';
import PrimaryButton from './ui/PrimaryButton';

const competitionColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

export default function MarketGap({ gaps, recommendedGap, onConfirm, loading, onBack, backLabel, onNext, nextLabel, navDisabled }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedIdx, setSelectedIdx] = useState(recommendedGap ?? 0);

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
      <div className="mb-8 animate-rise">
        <p className="eyebrow mb-2">Step 4 · Market Gaps</p>
        <h2 className={`font-section-title text-2xl sm:text-3xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Market Gap Analysis</h2>
        <p className={`mt-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          Niches your competitors are ignoring — ranked by opportunity.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {gaps.map((gap, i) => {
          const isSelected = i === selectedIdx;
          const isRecommended = i === (recommendedGap ?? 0);

          return (
            <div
              key={i}
              className={`animate-rise rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                isSelected
                  ? 'border-hookline-500 shadow-glow ' + (isDark ? 'bg-zinc-900/60 backdrop-blur-md' : 'bg-white')
                  : isDark
                    ? 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
                    : 'border-gray-200 bg-white hover:border-hookline-200'
              }`}
              style={{ animationDelay: `${0.05 + i * 0.05}s` }}
            >
              <button
                type="button"
                onClick={() => setSelectedIdx(i)}
                className="w-full text-left p-6 focus:outline-none"
              >
                <div className="flex items-center gap-3 mb-3">
                  {isRecommended && (
                    <span className="px-3 py-1 bg-hookline-100 text-hookline-700 dark:bg-hookline-900/40 dark:text-hookline-300 text-xs font-bold uppercase rounded-full">
                      Top Opportunity
                    </span>
                  )}
                  {!isRecommended && isSelected && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold uppercase rounded-full">
                      Selected Opportunity
                    </span>
                  )}
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${competitionColors[gap.competitionLevel]}`}>
                    {gap.competitionLevel} competition
                  </span>
                </div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {gap.niche}
                </h3>
              </button>

              <motion.div
                initial={false}
                animate={{ height: isSelected ? 'auto' : 0, opacity: isSelected ? 1 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-2 border-t border-zinc-800/10 dark:border-zinc-800/40 space-y-4 text-sm">
                  <div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Why demand exists</h4>
                    <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>{gap.demand}</p>
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>The opportunity</h4>
                    <p className={isDark ? 'text-zinc-400' : 'text-gray-600'}>{gap.opportunity}</p>
                  </div>
                  <div className={`rounded-lg p-4 border ${isDark ? 'bg-hookline-950/20 border-hookline-900/40 text-hookline-300' : 'bg-hookline-50 border-hookline-100 text-hookline-900'}`}>
                    <h4 className={`font-bold mb-1 ${isDark ? 'text-hookline-400' : 'text-hookline-700'}`}>Ideal lead profile</h4>
                    <p className="leading-relaxed">{gap.recommendedTarget}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <PrimaryButton onClick={() => onConfirm(selectedIdx)} loading={loading} loadingText="Generating leads...">
        Confirm Target &amp; Generate Leads
      </PrimaryButton>
    </div>
  );
}
