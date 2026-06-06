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
    stiffness: 110,
    damping: 26,
    mass: 0.35,
    restDelta: 0.001,
  });

  const headerY = useTransform(smoothProgress, [0, 0.45, 1], [28, 0, -36]);
  const headerOpacity = useTransform(smoothProgress, [0, 0.2, 0.75, 1], [0.55, 1, 1, 0.65]);

  const cardY = useTransform(
    smoothProgress,
    [0, 0.45, 1],
    isMobile ? [48, 0, -24] : [72, 0, -32],
  );
  const cardScale = useTransform(
    smoothProgress,
    [0, 0.45, 1],
    isMobile ? [0.94, 1, 0.97] : [0.9, 1, 0.96],
  );
  const cardRotate = useTransform(
    smoothProgress,
    [0, 0.3, 0.5, 1],
    isMobile ? [0, 0, 0, 0] : [8, 2, 0, -2],
  );
  const cardOpacity = useTransform(smoothProgress, [0, 0.18, 0.82, 1], [0.6, 1, 1, 0.85]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-[140vh] sm:h-[155vh] md:h-[175vh]',
        isDark ? 'bg-black' : 'bg-[#f5f5f7]',
        className,
      )}
    >
      <div className="sticky top-16 md:top-20 flex flex-col items-center justify-center px-4 py-10 md:py-14 min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-5rem)]">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 md:gap-14">
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
    <div className="relative z-10 w-full [perspective:1400px]">
      <motion.div
        style={{
          y: translate,
          scale,
          rotateX: rotate,
          opacity,
          transformOrigin: 'center center',
        }}
        className={cn(
          'mx-auto w-full h-[20rem] sm:h-[26rem] md:h-[30rem] border-2 p-2 md:p-4 rounded-3xl shadow-2xl will-change-transform',
          isDark
            ? 'border-zinc-700 bg-zinc-900 shadow-black/40'
            : 'border-gray-200 bg-white shadow-gray-300/50',
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
