import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type GlassEffectProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  href?: string;
  target?: string;
  tint?: string;
  highlight?: string;
};

export function GlassFilter() {
  return (
    <svg style={{ display: 'none' }} aria-hidden="true">
      <filter
        id="glass-distortion"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.001 0.005"
          numOctaves="1"
          seed="17"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="200"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

export function GlassEffect({
  children,
  className = '',
  style = {},
  href,
  target = '_blank',
  tint = 'rgba(255, 255, 255, 0.22)',
  highlight = 'rgba(255, 255, 255, 0.35)',
}: GlassEffectProps) {
  const glassStyle: CSSProperties = {
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 24px rgba(0, 0, 0, 0.06)',
    transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
    ...style,
  };

  const content = (
    <div
      className={cn(
        'relative flex overflow-hidden transition-all duration-500 rounded-2xl',
        href && 'cursor-pointer hover:scale-[1.01]',
        className,
      )}
      style={glassStyle}
    >
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-inherit"
        style={{
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
          filter: 'url(#glass-distortion)',
          isolation: 'isolate',
        }}
      />
      <div
        className="absolute inset-0 z-10 rounded-inherit"
        style={{ background: tint }}
      />
      <div
        className="absolute inset-0 z-20 rounded-inherit overflow-hidden pointer-events-none"
        style={{
          boxShadow: `inset 1px 1px 1px 0 ${highlight}, inset -1px -1px 1px 0 rgba(255, 255, 255, 0.08)`,
        }}
      />
      <div className="relative z-30 w-full">{children}</div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target={target} rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}

export type GlassCardColor = 'green' | 'yellow' | 'blue' | 'red';

const glassThemes = {
  green: {
    dark: {
      tint: 'rgba(34, 197, 94, 0.14)',
      highlight: 'rgba(74, 222, 128, 0.35)',
      border: 'border-green-500/25',
      text: 'text-green-300',
    },
    light: {
      tint: 'rgba(34, 197, 94, 0.16)',
      highlight: 'rgba(134, 239, 172, 0.55)',
      border: 'border-green-400/40',
      text: 'text-green-800',
    },
  },
  yellow: {
    dark: {
      tint: 'rgba(234, 179, 8, 0.14)',
      highlight: 'rgba(250, 204, 21, 0.32)',
      border: 'border-yellow-500/25',
      text: 'text-yellow-300',
    },
    light: {
      tint: 'rgba(234, 179, 8, 0.16)',
      highlight: 'rgba(253, 224, 71, 0.5)',
      border: 'border-yellow-400/40',
      text: 'text-yellow-800',
    },
  },
  blue: {
    dark: {
      tint: 'rgba(59, 130, 246, 0.14)',
      highlight: 'rgba(96, 165, 250, 0.35)',
      border: 'border-blue-500/25',
      text: 'text-blue-300',
    },
    light: {
      tint: 'rgba(59, 130, 246, 0.14)',
      highlight: 'rgba(147, 197, 253, 0.55)',
      border: 'border-blue-400/40',
      text: 'text-blue-800',
    },
  },
  red: {
    dark: {
      tint: 'rgba(239, 68, 68, 0.14)',
      highlight: 'rgba(248, 113, 113, 0.32)',
      border: 'border-red-500/25',
      text: 'text-red-300',
    },
    light: {
      tint: 'rgba(239, 68, 68, 0.14)',
      highlight: 'rgba(252, 165, 165, 0.5)',
      border: 'border-red-400/40',
      text: 'text-red-800',
    },
  },
};

type GlassAnalysisCardProps = {
  title: string;
  items: string[];
  color: GlassCardColor;
  isDark?: boolean;
};

export function GlassAnalysisCard({ title, items, color, isDark = true }: GlassAnalysisCardProps) {
  const theme = glassThemes[color][isDark ? 'dark' : 'light'];

  return (
    <GlassEffect
      className={cn('border', theme.border, theme.text)}
      tint={theme.tint}
      highlight={theme.highlight}
    >
      <div className="p-5">
        <h3 className="font-section-title text-sm uppercase tracking-wide mb-3 opacity-90">{title}</h3>
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={index} className="text-sm font-body flex gap-2.5 leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </GlassEffect>
  );
}
