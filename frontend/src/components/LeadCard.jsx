import { useTheme } from '../context/ThemeContext';

function ScoreBadge({ label, score, highlight, isDark }) {
  const badgeClass = highlight
    ? 'bg-hookline-500 text-white'
    : isDark
      ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
      : 'bg-gray-100 text-gray-700';

  const scoreClass = highlight
    ? 'text-white'
    : isDark
      ? 'text-white'
      : 'text-gray-900';

  const labelClass = highlight
    ? 'text-hookline-100'
    : isDark
      ? 'text-zinc-500'
      : 'text-gray-500';

  return (
    <div className={`text-center px-3 py-2 rounded-lg ${badgeClass}`}>
      <div className={`text-lg font-bold ${scoreClass}`}>{score}</div>
      <div className={`text-xs ${labelClass}`}>{label}</div>
    </div>
  );
}

function ContactRow({ label, children, isDark }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 border-b last:border-b-0 ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
      <span className={`text-xs font-bold uppercase tracking-wide shrink-0 sm:w-20 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
        {label}
      </span>
      <div className={`text-sm ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{children}</div>
    </div>
  );
}

function formatWebsiteUrl(website) {
  if (!website) return '';
  return website.startsWith('http') ? website : `https://${website}`;
}

export default function LeadCard({ lead, onSkip, skipped }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (skipped) return null;

  const websiteUrl = formatWebsiteUrl(lead.website);
  const mapsUrl = lead.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`
    : null;

  return (
    <div className={`rounded-2xl border p-6 transition-all duration-300 hover:shadow-md ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="mb-4">
        <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{lead.name}</h3>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <ScoreBadge label="Fit" score={lead.fitScore} isDark={isDark} />
        <ScoreBadge label="Budget" score={lead.budgetScore} isDark={isDark} />
        <ScoreBadge label="Response" score={lead.responseScore} isDark={isDark} />
        <ScoreBadge label="Priority" score={lead.priorityScore} highlight isDark={isDark} />
      </div>

      <div className={`rounded-lg p-4 mb-4 border ${isDark ? 'bg-hookline-950/20 border-hookline-900/40 text-hookline-300' : 'bg-hookline-50 border-hookline-100 text-hookline-900'}`}>
        <h4 className={`text-xs font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>Why reach out</h4>
        <p className="text-sm leading-relaxed">{lead.hook}</p>
      </div>

      <div className={`rounded-lg p-4 mb-4 border ${isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
        <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Contact information</h4>
        <ContactRow label="Phone" isDark={isDark}>
          {lead.phone ? (
            <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="text-hookline-500 hover:text-hookline-600 font-medium">
              {lead.phone}
            </a>
          ) : (
            <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>Not listed</span>
          )}
        </ContactRow>
        <ContactRow label="Email" isDark={isDark}>
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="text-hookline-500 hover:text-hookline-600 font-medium break-all">
              {lead.email}
            </a>
          ) : (
            <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>Not listed</span>
          )}
        </ContactRow>
        <ContactRow label="Website" isDark={isDark}>
          {websiteUrl ? (
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-hookline-500 hover:text-hookline-600 font-medium break-all">
              {lead.website}
            </a>
          ) : (
            <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>Not listed</span>
          )}
        </ContactRow>
        <ContactRow label="Address" isDark={isDark}>
          {lead.address ? (
            mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-hookline-500 transition break-words">
                {lead.address}
              </a>
            ) : (
              lead.address
            )
          ) : (
            <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>Not listed</span>
          )}
        </ContactRow>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onSkip(lead)}
          className={`px-4 py-2.5 font-semibold rounded-xl transition text-sm ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
