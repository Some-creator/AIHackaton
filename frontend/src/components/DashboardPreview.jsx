const MOCK_LEAD = {
  name: 'Riverfront Event Co.',
  rating: 4.6,
  reviewCount: 128,
  hook: 'Hosts 40+ corporate events yearly but has no dedicated beverage partner on retainer.',
  fitScore: 8.4,
  budgetScore: 7.8,
  responseScore: 8.1,
  priorityScore: 8.7,
  phone: '(713) 555-0142',
  email: 'events@riverfrontco.com',
};

const MOCK_COMPETITOR = {
  name: 'City Sip Mobile Bar',
  targetMarket: 'Corporate & wedding clients',
  strength: 'Strong Instagram presence',
  weakness: 'Limited weekday availability',
};

function ScorePill({ label, score, highlight, isDark }) {
  return (
    <div
      className={`text-center rounded-lg px-1.5 py-1 ${
        highlight
          ? 'bg-hookline-500 text-white'
          : isDark
            ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
            : 'bg-gray-100 text-gray-700'
      }`}
    >
      <div className={`text-xs font-bold ${highlight ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>
        {score}
      </div>
      <div className={`text-[8px] leading-tight ${highlight ? 'text-hookline-100' : isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
        {label}
      </div>
    </div>
  );
}

function MapMock({ isDark }) {
  return (
    <div
      className={`relative h-full min-h-[9rem] rounded-xl border overflow-hidden ${
        isDark ? 'border-zinc-700 bg-zinc-900' : 'border-gray-200 bg-gray-100'
      }`}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(rgba(125,144,250,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(125,144,250,0.15) 1px, transparent 1px)'
            : 'linear-gradient(rgba(79,110,247,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(79,110,247,0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {[
        { top: '28%', left: '35%' },
        { top: '52%', left: '58%' },
        { top: '38%', left: '72%' },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: pos.top, left: pos.left }}
        >
          <span className="block h-2.5 w-2.5 rounded-full bg-hookline-500 ring-2 ring-white/80 shadow-sm" />
        </div>
      ))}
      <div
        className={`absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-[9px] font-semibold ${
          isDark ? 'bg-zinc-950/80 text-zinc-400' : 'bg-white/90 text-gray-500'
        }`}
      >
        Houston metro
      </div>
    </div>
  );
}

export default function DashboardPreview({ theme = 'dark' }) {
  const isDark = theme === 'dark';

  return (
    <div className={`h-full w-full overflow-y-auto p-4 md:p-5 ${isDark ? 'bg-zinc-950' : 'bg-[#f5f5f7]'}`}>
      {/* Same page chrome as in-app steps */}
      <div className="mb-4">
        <p className="eyebrow mb-1.5">Step 5 · Leads</p>
        <h3 className={`font-section-title text-base md:text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Your Leads
        </h3>
        <p className={`mt-0.5 text-xs ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          48 qualified leads with contact info — sorted by priority
        </p>
      </div>

      {/* Leads page layout: map + lead card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <MapMock isDark={isDark} />

        <div
          className={`rounded-2xl border-2 p-3 ${
            isDark
              ? 'border-hookline-500/50 bg-zinc-900/60 shadow-lg shadow-hookline-500/5'
              : 'border-hookline-500 bg-white shadow-md'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {MOCK_LEAD.name}
            </h4>
            <div className={`shrink-0 rounded-md border px-1.5 py-0.5 ${isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-gray-200 bg-gray-50'}`}>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{MOCK_LEAD.rating}</span>
              <span className="text-amber-400 text-[10px] ml-0.5">★</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 mb-2">
            <ScorePill label="Fit" score={MOCK_LEAD.fitScore} isDark={isDark} />
            <ScorePill label="Budget" score={MOCK_LEAD.budgetScore} isDark={isDark} />
            <ScorePill label="Response" score={MOCK_LEAD.responseScore} isDark={isDark} />
            <ScorePill label="Priority" score={MOCK_LEAD.priorityScore} highlight isDark={isDark} />
          </div>

          <div
            className={`rounded-lg border p-2 mb-2 ${
              isDark ? 'bg-hookline-950/20 border-hookline-900/40 text-hookline-300' : 'bg-hookline-50 border-hookline-100 text-hookline-900'
            }`}
          >
            <p className={`text-[9px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
              Why reach out
            </p>
            <p className="text-[10px] leading-snug line-clamp-2">{MOCK_LEAD.hook}</p>
          </div>

          <div className={`text-[10px] space-y-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            <p>
              <span className="font-semibold">Phone:</span>{' '}
              <span className="text-hookline-500">{MOCK_LEAD.phone}</span>
            </p>
            <p className="truncate">
              <span className="font-semibold">Email:</span>{' '}
              <span className="text-hookline-500">{MOCK_LEAD.email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Competitor card — same surface-card as benchmark step */}
      <div className="surface-card p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className={`text-[9px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Step 3 · Competitor
            </p>
            <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{MOCK_COMPETITOR.name}</h4>
            <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{MOCK_COMPETITOR.targetMarket}</p>
          </div>
          <span className={`text-[10px] font-semibold shrink-0 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
            Visit →
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <p className={`font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-green-400' : 'text-green-700'}`}>Strength</p>
            <p className={isDark ? 'text-zinc-300' : 'text-gray-700'}>
              <span className="text-green-500 font-bold">+</span> {MOCK_COMPETITOR.strength}
            </p>
          </div>
          <div>
            <p className={`font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-red-400' : 'text-red-700'}`}>Weakness</p>
            <p className={isDark ? 'text-zinc-300' : 'text-gray-700'}>
              <span className="text-red-400 font-bold">-</span> {MOCK_COMPETITOR.weakness}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
