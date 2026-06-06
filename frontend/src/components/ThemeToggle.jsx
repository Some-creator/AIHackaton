import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
        isDark
          ? 'bg-white/10 hover:bg-white/20 text-amber-300 border border-white/15'
          : 'bg-gray-200/80 hover:bg-gray-300/80 text-gray-700 border border-gray-300/50'
      } ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
