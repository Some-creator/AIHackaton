import React, { useRef, useState, useEffect, type ReactNode } from 'react';
import { useScroll, useTransform, motion, type MotionValue } from 'framer-motion';
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
  const [isMobile, setIsMobile] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Flat at rest; subtle motion only while scrolling through the section
  const rotate = useTransform(scrollYProgress, [0, 0.35, 1], [0, 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 1], isMobile ? [1, 1, 0.94] : [1, 1, 0.96]);
  const headerY = useTransform(scrollYProgress, [0, 0.5, 1], [0, -12, -48]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0.85]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center px-4 py-16 md:py-24',
        isDark ? 'bg-black' : 'bg-[#f5f5f7]',
        className,
      )}
      style={{ minHeight: isMobile ? 'auto' : '100vh' }}
    >
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-10 md:gap-14">
        <ScrollHeader translate={headerY} opacity={headerOpacity} titleComponent={titleComponent} />
        <ScrollCard rotate={rotate} scale={scale} theme={theme}>
          {children}
        </ScrollCard>
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
      style={{ translateY: translate, opacity }}
      className="relative z-20 text-center px-2"
    >
      {titleComponent}
    </motion.div>
  );
}

function ScrollCard({
  rotate,
  scale,
  theme,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  theme?: 'dark' | 'light';
  children: ReactNode;
}) {
  const isDark = theme === 'dark';

  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        transformPerspective: 1200,
        transformOrigin: 'center bottom',
      }}
      className={cn(
        'relative z-10 mx-auto w-full h-[22rem] sm:h-[28rem] md:h-[32rem] border-2 p-2 md:p-4 rounded-3xl shadow-xl',
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
  );
}

export { ScrollHeader, ScrollCard };
