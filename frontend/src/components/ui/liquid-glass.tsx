import type { CSSProperties, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

type GlassEffectProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tint?: string;
  accentClass?: string;
};

export function GlassFilter() {
  return null;
}

export function GlassEffect({
  children,
  className = '',
  style = {},
  tint = 'rgba(255, 255, 255, 0.06)',
  accentClass = 'border-l-zinc-500',
}: GlassEffectProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 shadow-lg',
        'border-l-[5px]',
        accentClass,
        className,
      )}
      style={{
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.18)',
        ...style,
      }}
    >
      <div
        className="absolute inset-0 rounded-inherit"
        style={{
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          background: tint,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-inherit"
        style={{
          boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export type GlassCardColor = 'green' | 'amber' | 'blue' | 'red';

const glassThemes = {
  green: {
    dark: {
      tint: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 78, 59, 0.35) 100%)',
      accentClass: 'border-l-emerald-400',
      iconBg: 'bg-emerald-500/25 border border-emerald-400/30',
      iconColor: 'text-emerald-300',
      label: 'text-emerald-300',
      bullet: 'bg-emerald-400',
      body: 'text-zinc-200',
    },
    light: {
      tint: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(209, 250, 229, 0.55) 100%)',
      accentClass: 'border-l-emerald-500',
      iconBg: 'bg-emerald-100 border border-emerald-200',
      iconColor: 'text-emerald-700',
      label: 'text-emerald-800',
      bullet: 'bg-emerald-500',
      body: 'text-gray-800',
    },
  },
  amber: {
    dark: {
      tint: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(120, 53, 15, 0.35) 100%)',
      accentClass: 'border-l-amber-400',
      iconBg: 'bg-amber-500/25 border border-amber-400/30',
      iconColor: 'text-amber-300',
      label: 'text-amber-300',
      bullet: 'bg-amber-400',
      body: 'text-zinc-200',
    },
    light: {
      tint: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(254, 243, 199, 0.6) 100%)',
      accentClass: 'border-l-amber-500',
      iconBg: 'bg-amber-100 border border-amber-200',
      iconColor: 'text-amber-700',
      label: 'text-amber-900',
      bullet: 'bg-amber-500',
      body: 'text-gray-800',
    },
  },
  blue: {
    dark: {
      tint: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(30, 58, 138, 0.35) 100%)',
      accentClass: 'border-l-sky-400',
      iconBg: 'bg-sky-500/25 border border-sky-400/30',
      iconColor: 'text-sky-300',
      label: 'text-sky-300',
      bullet: 'bg-sky-400',
      body: 'text-zinc-200',
    },
    light: {
      tint: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(219, 234, 254, 0.65) 100%)',
      accentClass: 'border-l-blue-500',
      iconBg: 'bg-blue-100 border border-blue-200',
      iconColor: 'text-blue-700',
      label: 'text-blue-900',
      bullet: 'bg-blue-500',
      body: 'text-gray-800',
    },
  },
  red: {
    dark: {
      tint: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(136, 19, 55, 0.35) 100%)',
      accentClass: 'border-l-rose-400',
      iconBg: 'bg-rose-500/25 border border-rose-400/30',
      iconColor: 'text-rose-300',
      label: 'text-rose-300',
      bullet: 'bg-rose-400',
      body: 'text-zinc-200',
    },
    light: {
      tint: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(255, 228, 230, 0.65) 100%)',
      accentClass: 'border-l-rose-500',
      iconBg: 'bg-rose-100 border border-rose-200',
      iconColor: 'text-rose-700',
      label: 'text-rose-900',
      bullet: 'bg-rose-500',
      body: 'text-gray-800',
    },
  },
};

const cardIcons = {
  green: CheckCircle2,
  amber: AlertTriangle,
  blue: Lightbulb,
  red: SearchX,
};

type GlassAnalysisCardProps = {
  title: string;
  items: string[];
  color: GlassCardColor;
  isDark?: boolean;
};

export function GlassAnalysisCard({ title, items, color, isDark = true }: GlassAnalysisCardProps) {
  const theme = glassThemes[color][isDark ? 'dark' : 'light'];
  const Icon = cardIcons[color];

  return (
    <GlassEffect
      className={isDark ? 'bg-zinc-950/40' : 'bg-white/60 border-black/5'}
      tint={theme.tint}
      accentClass={theme.accentClass}
    >
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', theme.iconBg)}>
            <Icon className={cn('h-5 w-5', theme.iconColor)} aria-hidden="true" />
          </div>
          <h3 className={cn('font-section-title text-base tracking-wide', theme.label)}>{title}</h3>
        </div>
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={index} className={cn('flex gap-3 text-sm font-body leading-relaxed', theme.body)}>
              <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', theme.bullet)} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </GlassEffect>
  );
}
