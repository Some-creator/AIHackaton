const WORKFLOW_STEPS = ['onboarding', 'analysis', 'competitors', 'gap', 'leads'];

const STEP_LABELS = {
  onboarding: 'Start',
  analysis: 'Analysis',
  competitors: 'Competitors',
  gap: 'Market Gap',
  leads: 'Leads',
};

function pillClass({ isActive, isBehind, isAheadComplete, isDark, isVertical }) {
  const base = isVertical
    ? 'min-w-[8.5rem] px-5 py-2.5 text-base font-semibold rounded-full whitespace-nowrap text-center transition'
    : 'px-3.5 py-1.5 text-sm font-semibold rounded-full whitespace-nowrap transition';

  if (isActive) {
    return `${base} bg-hookline-600 bg-gradient-to-r from-hookline-500 to-violet-600 text-white shadow-sm shadow-hookline-500/25`;
  }
  if (isBehind || isAheadComplete) {
    return `${base} ${isDark ? 'bg-hookline-500/20 text-hookline-300' : 'bg-hookline-100 text-hookline-700'}`;
  }
  return `${base} ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-400'}`;
}

function VerticalConnector({ connectorIndex, currentIndex, animatingConnectorIndex, transitionActive, isDark }) {
  const isCompleted =
    currentIndex >= connectorIndex &&
    !(animatingConnectorIndex === connectorIndex && transitionActive);
  const isAnimating = animatingConnectorIndex === connectorIndex && transitionActive;
  const litRgb = isDark ? '255, 255, 255' : '124, 58, 237';
  const trackClass = isDark ? 'bg-zinc-700/80' : 'bg-gray-300';

  return (
    <div
      className="relative w-1.5 h-8 shrink-0 rounded-none"
      style={{ '--wf-lit': litRgb }}
      aria-hidden="true"
    >
      {!isCompleted && !isAnimating && (
        <div className={`absolute inset-0 rounded-none ${trackClass}`} />
      )}

      {isCompleted && (
        <div className="workflow-connector-done absolute inset-0 rounded-none" />
      )}

      {isAnimating && (
        <div className="workflow-connector-active absolute inset-0 rounded-none">
          <div className="workflow-connector-active-pulse" />
        </div>
      )}
    </div>
  );
}

function HorizontalConnector({ isComplete, isDark }) {
  return (
    <div
      className={`w-5 sm:w-7 h-0.5 shrink-0 rounded-full ${
        isComplete
          ? isDark
            ? 'bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.45)]'
            : 'bg-hookline-400'
          : isDark
            ? 'bg-zinc-700'
            : 'bg-gray-200'
      }`}
      aria-hidden="true"
    />
  );
}

export default function WorkflowStepper({
  currentStep,
  onGoToStep,
  canNavigateToStep,
  loading = false,
  isDark = false,
  orientation = 'horizontal',
  animatingConnectorIndex = null,
  transitionActive = false,
}) {
  const currentIndex = WORKFLOW_STEPS.indexOf(currentStep);
  if (currentIndex < 0) return null;

  const isVertical = orientation === 'vertical';

  return (
    <nav
      aria-label="Analysis progress"
      className={
        isVertical
          ? 'flex flex-col items-center gap-0'
          : 'flex items-center justify-center gap-1 overflow-x-auto py-1'
      }
    >
      {WORKFLOW_STEPS.map((stepKey, i) => {
        const isActive = currentIndex === i;
        const isBehind = currentIndex > i;
        const isAheadComplete = currentIndex < i && canNavigateToStep?.(stepKey);
        const isClickable = !loading && (isBehind || isAheadComplete);

        const pillClasses = pillClass({ isActive, isBehind, isAheadComplete, isDark, isVertical });

        return (
          <div
            key={stepKey}
            className={isVertical ? 'flex flex-col items-center' : 'flex items-center shrink-0'}
          >
            {i > 0 &&
              (isVertical ? (
                <VerticalConnector
                  connectorIndex={i}
                  currentIndex={currentIndex}
                  animatingConnectorIndex={animatingConnectorIndex}
                  transitionActive={transitionActive}
                  isDark={isDark}
                />
              ) : (
                <HorizontalConnector isComplete={isBehind || isAheadComplete} isDark={isDark} />
              ))}
            {isClickable ? (
              <button
                type="button"
                onClick={() => onGoToStep?.(stepKey)}
                className={`${pillClasses} hover:opacity-80`}
              >
                {STEP_LABELS[stepKey]}
              </button>
            ) : (
              <span className={pillClasses}>{STEP_LABELS[stepKey]}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
