import React, { useRef, useState, useEffect, type ReactNode } from 'react';
import { useScroll, useTransform, useSpring, motion, type MotionValue } from 'framer-motion';
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
    offset: ['start end', 'center center'],
  });
  const [isMobile, setIsMobile] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.35,
    restDelta: 0.001,
  });

  const headerY = useTransform(smoothProgress, [0, 1], [24, 0]);
  const headerOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.4, 0.85, 1]);

  const cardY = useTransform(
    smoothProgress,
    [0, 1],
    isMobile ? [48, 0] : [64, 0],
  );
  const cardOpacity = useTransform(smoothProgress, [0, 0.35, 1], [0, 0.9, 1]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative py-16 md:py-24',
        isDark ? 'bg-background' : 'bg-[#f5f5f7]',
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 md:gap-10 md:px-6">
        <ScrollHeader translate={headerY} opacity={headerOpacity} titleComponent={titleComponent} />
        <ScrollCard translate={cardY} opacity={cardOpacity} theme={theme}>
          {children}
        </ScrollCard>
      </div>
    </div>
  );
}

function ScrollHeader({
  translate,
  opacity,
  titleComponent,
}: {
  translate: MotionValue<number>;
  opacity: MotionValue<number>;
  titleComponent: string | ReactNode;
}) {
  return (
    <motion.div
      style={{ y: translate, opacity }}
      className="relative z-20 w-full text-center px-2 will-change-transform"
    >
      {titleComponent}
    </motion.div>
  );
}

function ScrollCard({
  translate,
  opacity,
  theme,
  children,
}: {
  translate: MotionValue<number>;
  opacity: MotionValue<number>;
  theme?: 'dark' | 'light';
  children: ReactNode;
}) {
  const isDark = theme === 'dark';

  return (
    <motion.div
      style={{ y: translate, opacity }}
      className={cn(
        'relative z-10 mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border shadow-lg will-change-transform',
        'h-[22rem] sm:h-[26rem] md:h-[30rem]',
        isDark
          ? 'border-zinc-800 bg-zinc-900/80 shadow-black/40'
          : 'border-gray-200 bg-white shadow-gray-300/30',
      )}
    >
      {children}
    </motion.div>
  );
}
