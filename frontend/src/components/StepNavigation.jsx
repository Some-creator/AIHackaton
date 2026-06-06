import StepBackButton from './StepBackButton';
import StepNextButton from './StepNextButton';

export default function StepNavigation({
  onBack,
  backLabel,
  onNext,
  nextLabel,
  backDisabled = false,
  nextDisabled = false,
}) {
  if (!onBack && !onNext) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 min-h-7">
      <div className="min-w-0">
        {onBack ? (
          <StepBackButton onBack={onBack} disabled={backDisabled} label={backLabel} className="mb-0" />
        ) : (
          <span />
        )}
      </div>
      <div className="shrink-0">
        <StepNextButton onNext={onNext} disabled={nextDisabled} label={nextLabel} />
      </div>
    </div>
  );
}
