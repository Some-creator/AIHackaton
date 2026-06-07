import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';

type InteractiveGradientCtaProps = {
  children: ReactNode;
  className?: string;
};

export function InteractiveGradientCta({ children, className }: InteractiveGradientCtaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 40 });

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSpotlight({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setSpotlight({ x: 50, y: 40 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-10 sm:px-12 sm:py-12',
        className,
      )}
    >
      <div className="interactive-cta-gradient absolute inset-0" aria-hidden="true" />

      <div
        className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen transition-[background] duration-300 ease-out"
        style={{
          background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, rgba(125, 211, 252, 0.55) 0%, transparent 42%)`,
        }}
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-cyan-300/30 blur-3xl animate-cta-float-a"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-blue-500/35 blur-3xl animate-cta-float-b"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/20 blur-3xl animate-cta-float-c"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,23,0.25)_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
