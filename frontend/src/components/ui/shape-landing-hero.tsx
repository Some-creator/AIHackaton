import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { renderHighlightedText } from '@/components/ui/animated-gradient-text';

type Theme = 'dark' | 'light';

const FALLING_SHAPES = [
  { width: 320, height: 90, rotate: 14, gradient: 'from-violet-500', left: '8%', duration: 22, delay: 0 },
  { width: 260, height: 72, rotate: -18, gradient: 'from-fuchsia-500', left: '72%', duration: 19, delay: 2 },
  { width: 200, height: 56, rotate: 8, gradient: 'from-cyan-400', left: '38%', duration: 25, delay: 4 },
  { width: 180, height: 48, rotate: -22, gradient: 'from-amber-400', left: '18%', duration: 21, delay: 6 },
  { width: 240, height: 64, rotate: 16, gradient: 'from-emerald-400', left: '58%', duration: 23, delay: 1 },
  { width: 140, height: 40, rotate: -10, gradient: 'from-sky-400', left: '85%', duration: 20, delay: 8 },
  { width: 300, height: 80, rotate: -6, gradient: 'from-rose-500', left: '45%', duration: 27, delay: 3 },
];

function FallingShape({
  width,
  height,
  rotate,
  gradient,
  left,
  duration,
  delay,
  theme,
}: {
  width: number;
  height: number;
  rotate: number;
  gradient: string;
  left: string;
  duration: number;
  delay: number;
  theme: Theme;
}) {
  const opacity = theme === 'dark' ? '40' : '25';

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left, width, height }}
      initial={{ y: '-20vh', opacity: 0, rotate: rotate - 20 }}
      animate={{
        y: ['-20vh', '120vh'],
        opacity: [0, 0.9, 0.9, 0],
        rotate: [rotate - 20, rotate + 6, rotate - 4, rotate + 10],
      }}
      transition={{
        y: { duration, repeat: Number.POSITIVE_INFINITY, ease: 'linear', delay },
        opacity: { duration, repeat: Number.POSITIVE_INFINITY, ease: 'linear', delay },
        rotate: { duration: duration * 0.8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', delay },
      }}
    >
      <div
        className={cn(
          'w-full h-full rounded-full bg-gradient-to-r to-transparent',
          `${gradient}/${opacity}`,
          'border border-white/20 shadow-lg',
          theme === 'dark' ? 'shadow-white/5' : 'shadow-black/5',
        )}
        style={{ transform: `rotate(${rotate}deg)` }}
      />
    </motion.div>
  );
}

function HeroGeometric({
  badge = 'AI Business Intelligence',
  title1 = 'Are businesses ignoring you?',
  title1Highlight = 'businesses',
  title2 = "Don't worry.",
  description = 'Paste your website. HookLine finds your market gaps and generates qualified leads in minutes.',
  theme = 'dark',
  children,
}: {
  badge?: string;
  title1?: string;
  title1Highlight?: string;
  title2?: string;
  description?: string;
  theme?: Theme;
  children?: ReactNode;
}) {
  const isDark = theme === 'dark';

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.3 + i * 0.15,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  };

  return (
    <div
      className={cn(
        'relative min-h-[90vh] w-full flex items-center justify-center overflow-hidden transition-colors duration-500',
        isDark
          ? 'bg-[#000000]'
          : 'bg-[#f5f5f7]',
      )}
    >
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          isDark
            ? 'bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom,_rgba(168,85,247,0.1)_0%,_transparent_55%)]'
            : 'bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom,_rgba(236,72,153,0.06)_0%,_transparent_55%)]',
        )}
      />

      <div className="absolute inset-0 overflow-hidden">
        {FALLING_SHAPES.map((shape, index) => (
          <FallingShape key={index} {...shape} theme={theme} />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 py-16">
        <div
          className={cn(
            'max-w-3xl mx-auto text-center rounded-[2rem] px-6 py-12 sm:px-12 sm:py-14 transition-all duration-500',
            isDark
              ? 'bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.5)]'
              : 'bg-white/80 backdrop-blur-2xl border border-black/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.08)]',
          )}
        >
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 md:mb-10 border',
              isDark
                ? 'bg-white/10 border-white/20 text-sky-300'
                : 'bg-black/[0.04] border-black/[0.08] text-blue-600',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-sm tracking-wide font-ui">{badge}</span>
          </motion.div>

          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1 className="font-hero text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-4 md:mb-6">
              <span
                className={cn(
                  'block',
                  isDark ? 'text-white' : 'text-gray-900',
                )}
              >
                {renderHighlightedText(title1, title1Highlight)}
              </span>
              <span
                className={cn(
                  'block mt-2',
                  isDark ? 'text-[#2997ff]' : 'text-[#0071e3]',
                )}
              >
                {title2}
              </span>
            </h1>
          </motion.div>

          <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
            <p
              className={cn(
                'font-body text-base sm:text-lg md:text-xl mb-10 max-w-xl mx-auto',
                isDark ? 'text-gray-200' : 'text-gray-600',
              )}
            >
              {description}
            </p>
          </motion.div>

          {children && (
            <motion.div custom={3} variants={fadeUpVariants} initial="hidden" animate="visible">
              {children}
            </motion.div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-32 pointer-events-none transition-opacity duration-500',
          isDark
            ? 'bg-gradient-to-t from-black to-transparent'
            : 'bg-gradient-to-t from-[#f5f5f7] to-transparent',
        )}
      />
    </div>
  );
}

export { HeroGeometric, FallingShape };
