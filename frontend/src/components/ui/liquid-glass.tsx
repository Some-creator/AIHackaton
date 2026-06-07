import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GlassCardColor = 'green' | 'orange' | 'blue' | 'violet';

const cardConfig = {
  green: {
    subtitle: "What's working well",
    Icon: CheckCircle2,
    dark: {
      strip: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      glow: 'shadow-[0_0_40px_-12px_rgba(16,185,129,0.45)]',
      shell: 'border-emerald-500/20 bg-zinc-900/70',
      iconWrap: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-400',
      title: 'text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
      item: 'border-emerald-500/10 bg-emerald-500/[0.06]',
      dot: 'bg-emerald-400',
      body: 'text-zinc-300',
    },
    light: {
      strip: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      glow: 'shadow-[0_8px_30px_-10px_rgba(16,185,129,0.35)]',
      shell: 'border-emerald-200 bg-white/90',
      iconWrap: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      title: 'text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      item: 'border-emerald-100 bg-emerald-50/50',
      dot: 'bg-emerald-500',
      body: 'text-gray-700',
    },
  },
  orange: {
    subtitle: 'Areas to address',
    Icon: AlertTriangle,
    dark: {
      strip: 'bg-gradient-to-r from-orange-500 to-amber-400',
      glow: 'shadow-[0_0_40px_-12px_rgba(249,115,22,0.45)]',
      shell: 'border-orange-500/20 bg-zinc-900/70',
      iconWrap: 'bg-orange-500/15 border-orange-400/25 text-orange-400',
      title: 'text-orange-400',
      badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
      item: 'border-orange-500/10 bg-orange-500/[0.06]',
      dot: 'bg-orange-400',
      body: 'text-zinc-300',
    },
    light: {
      strip: 'bg-gradient-to-r from-orange-500 to-amber-400',
      glow: 'shadow-[0_8px_30px_-10px_rgba(249,115,22,0.3)]',
      shell: 'border-orange-200 bg-white/90',
      iconWrap: 'bg-orange-50 border-orange-200 text-orange-600',
      title: 'text-orange-700',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
      item: 'border-orange-100 bg-orange-50/50',
      dot: 'bg-orange-500',
      body: 'text-gray-700',
    },
  },
  blue: {
    subtitle: 'Recommended actions',
    Icon: Lightbulb,
    dark: {
      strip: 'bg-gradient-to-r from-[#0071e3] to-[#2997ff]',
      glow: 'shadow-[0_0_40px_-12px_rgba(0,113,227,0.5)]',
      shell: 'border-[#0071e3]/25 bg-zinc-900/70',
      iconWrap: 'bg-[#0071e3]/15 border-[#2997ff]/25 text-[#2997ff]',
      title: 'text-[#2997ff]',
      badge: 'bg-[#0071e3]/15 text-sky-300 border-[#0071e3]/25',
      item: 'border-[#0071e3]/10 bg-[#0071e3]/[0.08]',
      dot: 'bg-[#2997ff]',
      body: 'text-zinc-300',
    },
    light: {
      strip: 'bg-gradient-to-r from-[#0071e3] to-[#2997ff]',
      glow: 'shadow-[0_8px_30px_-10px_rgba(0,113,227,0.25)]',
      shell: 'border-blue-200 bg-white/90',
      iconWrap: 'bg-blue-50 border-blue-200 text-[#0071e3]',
      title: 'text-[#0071e3]',
      badge: 'bg-blue-50 text-[#0071e3] border-blue-200',
      item: 'border-blue-100 bg-blue-50/40',
      dot: 'bg-[#0071e3]',
      body: 'text-gray-700',
    },
  },
  violet: {
    subtitle: 'Gaps in your offering',
    Icon: Sparkles,
    dark: {
      strip: 'bg-gradient-to-r from-violet-500 to-purple-400',
      glow: 'shadow-[0_0_40px_-12px_rgba(139,92,246,0.45)]',
      shell: 'border-violet-500/20 bg-zinc-900/70',
      iconWrap: 'bg-violet-500/15 border-violet-400/25 text-violet-400',
      title: 'text-violet-400',
      badge: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
      item: 'border-violet-500/10 bg-violet-500/[0.06]',
      dot: 'bg-violet-400',
      body: 'text-zinc-300',
    },
    light: {
      strip: 'bg-gradient-to-r from-violet-500 to-purple-400',
      glow: 'shadow-[0_8px_30px_-10px_rgba(139,92,246,0.3)]',
      shell: 'border-violet-200 bg-white/90',
      iconWrap: 'bg-violet-50 border-violet-200 text-violet-600',
      title: 'text-violet-700',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
      item: 'border-violet-100 bg-violet-50/50',
      dot: 'bg-violet-500',
      body: 'text-gray-700',
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
  const config = cardConfig[color];
  const theme = config[isDark ? 'dark' : 'light'];
  const Icon = config.Icon;

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300',
        'hover:-translate-y-0.5',
        theme.shell,
        theme.glow,
      )}
    >
      <div className={cn('h-1.5 w-full', theme.strip)} aria-hidden="true" />

      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
                theme.iconWrap,
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className={cn('font-section-title text-lg leading-tight', theme.title)}>{title}</h3>
              <p className={cn('mt-0.5 text-xs font-body-medium', isDark ? 'text-zinc-500' : 'text-gray-500')}>
                {config.subtitle}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
              theme.badge,
            )}
          >
            {items.length}
          </span>
        </div>

        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li
              key={index}
              className={cn(
                'flex gap-3 rounded-xl border px-3.5 py-3 text-sm font-body leading-relaxed',
                theme.item,
                theme.body,
              )}
            >
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', theme.dot)} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

// Kept for compatibility if referenced elsewhere
export function GlassFilter() {
  return null;
}

export function GlassEffect({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
