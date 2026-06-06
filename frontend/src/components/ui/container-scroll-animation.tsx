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
    offset: ['start start', 'end start'],
  });
  const [isMobile, setIsMobile] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scaleDimensions = () => (isMobile ? [0.7, 0.92] : [1.05, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center p-2 md:p-12',
        isDark ? 'bg-black' : 'bg-[#f5f5f7]',
        className,
      )}
      style={{ height: isMobile ? '52rem' : '72rem' }}
    >
      <div
        className="py-8 md:py-24 w-full relative"
        style={{ perspective: '1000px' }}
      >
        <ScrollHeader translate={translate} titleComponent={titleComponent} />
        <ScrollCard rotate={rotate} scale={scale} theme={theme}>
          {children}
        </ScrollCard>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-40',
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
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | ReactNode;
}) {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="max-w-5xl mx-auto text-center px-4"
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
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
      className={cn(
        'max-w-5xl -mt-8 md:-mt-12 mx-auto h-[26rem] md:h-[36rem] w-full border-4 p-2 md:p-5 rounded-[30px] shadow-2xl',
        isDark ? 'border-zinc-600 bg-[#222222]' : 'border-gray-300 bg-gray-200',
      )}
    >
      <div
        className={cn(
          'h-full w-full overflow-hidden rounded-2xl md:p-3',
          isDark ? 'bg-zinc-900' : 'bg-gray-100',
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}

export { ScrollHeader, ScrollCard };
