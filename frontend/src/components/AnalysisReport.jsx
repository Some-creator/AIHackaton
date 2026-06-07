import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';

const SECTION_DEFS = [
  {
    key: 'strengths',
    title: 'Strengths',
    subtitle: "What's working well",
    color: 'green',
    Icon: CheckCircle2,
  },
  {
    key: 'weaknesses',
    title: 'Weaknesses',
    subtitle: 'Areas to address',
    color: 'orange',
    Icon: AlertTriangle,
  },
  {
    key: 'improvements',
    title: 'Improvements',
    subtitle: 'Recommended actions',
    color: 'blue',
    Icon: Lightbulb,
  },
  {
    key: 'missing',
    title: 'Missing',
    subtitle: 'Gaps in your offering',
    color: 'violet',
    Icon: Sparkles,
  },
];

const palette = {
  green: {
    num: 'text-emerald-400',
    icon: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    dot: 'bg-emerald-400',
    label: 'text-emerald-400/90',
  },
  orange: {
    num: 'text-amber-400',
    icon: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    dot: 'bg-amber-400',
    label: 'text-amber-400/90',
  },
  blue: {
    num: 'text-hookline-400',
    icon: 'text-hookline-400 border-hookline-500/30 bg-hookline-500/10',
    dot: 'bg-hookline-400',
    label: 'text-hookline-400/90',
  },
  violet: {
    num: 'text-violet-400',
    icon: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    dot: 'bg-violet-400',
    label: 'text-violet-400/90',
  },
};

const paletteLight = {
  green: {
    num: 'text-emerald-600',
    icon: 'text-emerald-600 border-emerald-200 bg-emerald-50',
    dot: 'bg-emerald-500',
    label: 'text-emerald-700',
  },
  orange: {
    num: 'text-amber-600',
    icon: 'text-amber-600 border-amber-200 bg-amber-50',
    dot: 'bg-amber-500',
    label: 'text-amber-700',
  },
  blue: {
    num: 'text-hookline-600',
    icon: 'text-hookline-600 border-hookline-200 bg-hookline-50',
    dot: 'bg-hookline-500',
    label: 'text-hookline-700',
  },
  violet: {
    num: 'text-violet-600',
    icon: 'text-violet-600 border-violet-200 bg-violet-50',
    dot: 'bg-violet-500',
    label: 'text-violet-700',
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

function buildSummary(business) {
  const name = business?.name || 'This business';
  const type = business?.type || 'business';
  const market = business?.targetMarket?.trim();
  if (market) {
    return `A full read on ${name} — ${market.toLowerCase().replace(/\.$/, '')}, what's slipping, and the gaps worth closing next.`;
  }
  return `A full read on the ${type} — what holds up, what's slipping, and the gaps worth closing before the next push for customers.`;
}

const sectionContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

function ReportSection({ index, def, items, isDark }) {
  const colors = isDark ? palette[def.color] : paletteLight[def.color];
  const { Icon } = def;
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  const num = String(index).padStart(2, '0');

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={sectionContainer}
      className={`grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_1fr] gap-8 lg:gap-14 py-12 md:py-14 border-b last:border-b-0 ${
        isDark ? 'border-zinc-800/80' : 'border-gray-200/80'
      }`}
    >
      <motion.aside variants={fadeUp} custom={0} className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-2 mb-4">
          <span className={`font-mono text-sm font-semibold tracking-wider ${colors.num}`}>{num}</span>
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${colors.icon}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <h3 className={`font-section-title text-3xl md:text-4xl mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {def.title}
        </h3>
        <p className={`text-sm font-medium mb-5 ${colors.label}`}>{def.subtitle}</p>
        <p className={`text-[11px] font-mono uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {list.length} {list.length === 1 ? 'finding' : 'findings'}
        </p>
      </motion.aside>

      <ul className="space-y-0 min-w-0">
        {list.map((item, i) => (
          <motion.li
            key={`${def.key}-${i}`}
            variants={fadeUp}
            custom={0.08 + i * 0.07}
            className={`flex gap-4 py-5 md:py-6 border-b last:border-b-0 ${
              isDark ? 'border-zinc-800/60' : 'border-gray-100'
            }`}
          >
            <span className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${colors.dot}`} aria-hidden="true" />
            <p className={`text-base md:text-lg leading-relaxed ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
              {item}
            </p>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}

export default function AnalysisReport({ business, analysis, isDark }) {
  const sections = SECTION_DEFS.map((def) => ({
    ...def,
    items: analysis?.[def.key] || [],
  })).filter((s) => s.items.length > 0);

  return (
    <div className="relative">
      <div
        className={`pointer-events-none absolute -inset-x-6 top-0 h-64 rounded-3xl blur-3xl opacity-40 ${
          isDark ? 'bg-gradient-to-b from-hookline-500/10 via-violet-500/5 to-transparent' : 'bg-gradient-to-b from-hookline-100/80 to-transparent'
        }`}
        aria-hidden="true"
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={sectionContainer}
        className="relative mb-10 md:mb-12"
      >
        <motion.p variants={fadeUp} custom={0} className="eyebrow mb-3">
          Step 2 · Analysis
        </motion.p>
        <motion.h2
          variants={fadeUp}
          custom={0.05}
          className={`font-section-title text-4xl sm:text-5xl md:text-6xl tracking-tight mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}
        >
          {business?.name || 'Your business'}
          <span className="text-hookline-500">,</span>
          {' '}
          <span className="text-gradient-animate">analyzed</span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          custom={0.1}
          className={`max-w-3xl text-base md:text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}
        >
          {buildSummary(business)}
        </motion.p>
      </motion.div>

      <div
        className={`rounded-2xl border px-4 sm:px-6 md:px-8 ${
          isDark ? 'border-zinc-800/60 bg-zinc-950/30 backdrop-blur-sm' : 'border-gray-200/80 bg-white/60 backdrop-blur-sm'
        }`}
      >
        {sections.map((section, i) => (
          <ReportSection
            key={section.key}
            index={i + 1}
            def={section}
            items={section.items}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}
