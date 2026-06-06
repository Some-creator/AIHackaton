import { useTheme } from '../context/ThemeContext';

export default function StepNextButton({ onNext, disabled = false, label = 'next step', className = '' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!onNext) return null;

  return (
    <button
      type="button"
      onClick={onNext}
      disabled={disabled}
      className={`inline-flex items-center gap-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
        isDark ? 'text-sky-400 hover:text-sky-300' : 'text-[#0071e3] hover:text-[#0077ed]'
      } ${className}`}
    >
      Next: {label}
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
