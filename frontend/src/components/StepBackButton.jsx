import { useTheme } from '../context/ThemeContext';

export default function StepBackButton({ onBack, disabled = false, label = 'previous step', className = 'mb-6' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!onBack) return null;

  return (
    <button
      type="button"
      onClick={onBack}
      disabled={disabled}
      className={`inline-flex items-center gap-2 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
        isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
      } ${className}`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back to {label}
    </button>
  );
}
