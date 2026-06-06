import React, { useRef, type ReactNode } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ContainerScrollProps = {
  titleComponent: string | ReactNode;
  children: ReactNode;
  theme?: 'dark' | 'light';
  className?: string;
};

export function ContainerScroll({
  titleComponent,
  children,
  theme = 'dark',
  className,
}: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const isDark = theme === 'dark';

  const cardOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.85, 1, 1, 0.9]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative px-4 py-20 md:py-28',
        isDark ? 'bg-black' : 'bg-[#f5f5f7]',
        className,
      )}
    >
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative z-20 mb-12 md:mb-16 text-center px-2">{titleComponent}</div>

        <motion.div
          style={{ opacity: cardOpacity }}
          className={cn(
            'relative z-10 mx-auto w-full h-[20rem] sm:h-[26rem] md:h-[30rem] border-2 p-2 md:p-4 rounded-3xl shadow-xl',
            isDark ? 'border-zinc-700 bg-zinc-900' : 'border-gray-200 bg-white',
          )}
        >
          <div
            className={cn(
              'h-full w-full overflow-hidden rounded-2xl',
              isDark ? 'bg-zinc-950' : 'bg-gray-50',
            )}
          >
            {children}
          </div>
        </motion.div>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-24',
          isDark
            ? 'bg-gradient-to-b from-transparent to-zinc-950'
            : 'bg-gradient-to-b from-transparent to-white',
        )}
      />
    </div>
  );
}
