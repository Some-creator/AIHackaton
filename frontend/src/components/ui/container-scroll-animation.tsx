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
    offset: ['start start', 'end end'],
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
    stiffness: 100,
    damping: 24,
    mass: 0.3,
    restDelta: 0.001,
  });

  const headerY = useTransform(smoothProgress, [0, 0.4, 1], [20, 0, -20]);
  const headerOpacity = useTransform(smoothProgress, [0, 0.12, 0.88, 1], [0.85, 1, 1, 0.9]);

  const cardY = useTransform(
    smoothProgress,
    [0, 0.35, 0.55, 1],
    isMobile ? [36, 10, 0, -16] : [56, 14, 0, -20],
  );
  const cardScale = useTransform(
    smoothProgress,
    [0, 0.35, 0.55, 1],
    isMobile ? [0.92, 0.97, 1, 0.98] : [0.88, 0.95, 1, 0.97],
  );
  const cardRotate = useTransform(
    smoothProgress,
    [0, 0.25, 0.45, 0.65, 1],
    isMobile ? [12, 6, 0, 0, -4] : [20, 10, 0, 0, -6],
  );
  const cardOpacity = useTransform(smoothProgress, [0, 0.1, 0.9, 1], [0.88, 1, 1, 0.92]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-[105vh] sm:h-[112vh] md:h-[118vh]',
        isDark ? 'bg-black' : 'bg-[#f5f5f7]',
        className,
      )}
    >
      <div className="sticky top-16 md:top-20 flex flex-col items-center justify-center px-4 py-6 md:py-8 min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)]">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 md:gap-10">
          <ScrollHeader translate={headerY} opacity={headerOpacity} titleComponent={titleComponent} />
          <ScrollCard
            translate={cardY}
            scale={cardScale}
            rotate={cardRotate}
            opacity={cardOpacity}
            theme={theme}
          >
            {children}
          </ScrollCard>
        </div>
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
      className="relative z-20 text-center px-2 will-change-transform"
    >
      {titleComponent}
    </motion.div>
  );
}

function ScrollCard({
  translate,
  scale,
  rotate,
  opacity,
  theme,
  children,
}: {
  translate: MotionValue<number>;
  scale: MotionValue<number>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
  theme?: 'dark' | 'light';
  children: ReactNode;
}) {
  const isDark = theme === 'dark';

  return (
    <div
      className="relative z-10 w-full"
      style={{ perspective: 1400, perspectiveOrigin: '50% 100%' }}
    >
      <motion.div
        style={{
          y: translate,
          scale,
          rotateX: rotate,
          opacity,
          transformPerspective: 1400,
          transformOrigin: 'center bottom',
        }}
        className={cn(
          'mx-auto w-full h-[18rem] sm:h-[22rem] md:h-[26rem] border-2 p-2 md:p-3 rounded-3xl shadow-2xl will-change-transform',
          isDark
            ? 'border-zinc-700 bg-zinc-900 shadow-black/50'
            : 'border-gray-200 bg-white shadow-gray-400/40',
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
  );
}
