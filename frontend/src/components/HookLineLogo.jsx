import { cn } from '@/lib/utils';
import { useTheme } from '../context/ThemeContext';
import { HookLineMark, HookLineWordmark } from './HookLineWordmark';

const sizes = {
  sm: {
    wordmark: 'h-8 min-w-[150px]',
    full: 'h-[3rem] min-w-[176px]',
    mark: 'h-8 w-8',
  },
  md: {
    wordmark: 'h-9 min-w-[164px] sm:h-10 sm:min-w-[182px]',
    full: 'h-[3.5rem] min-w-[206px]',
    mark: 'h-9 w-9',
  },
  lg: {
    wordmark: 'h-11 min-w-[200px]',
    full: 'h-[4.5rem] min-w-[268px]',
    mark: 'h-10 w-10',
  },
};

export default function HookLineLogo({
  className,
  showTagline = false,
  showWordmark = true,
  size = 'md',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const s = sizes[size] || sizes.md;

  if (!showWordmark) {
    return (
      <HookLineMark
        isDark={isDark}
        className={cn('shrink-0 rounded-[22%] shadow-sm shadow-[#0071e3]/20', s.mark, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center transition-all duration-300',
        className,
      )}
    >
      <HookLineWordmark
        showTagline={showTagline}
        isDark={isDark}
        className={cn(
          showTagline ? s.full : s.wordmark,
          'drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]',
        )}
      />
    </span>
  );
}
