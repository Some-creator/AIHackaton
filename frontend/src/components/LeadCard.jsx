import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { buildLeadEmailTemplate, buildMailtoLink } from '../lib/leadEmailTemplate';

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

export default function LeadCard({ lead, business, analysis, marketGap, onSkip, skipped, selected = false, onSelect }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showEmail, setShowEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  if (skipped) return null;

  const websiteUrl = formatWebsiteUrl(lead.website);
  const mapsUrl = lead.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`
    : null;

  const emailTemplate = buildLeadEmailTemplate({ lead, business, analysis, marketGap });
  const mailtoLink = buildMailtoLink(lead.email, emailTemplate.subject, emailTemplate.body);

  const handleGenerateEmail = (e) => {
    e.stopPropagation();
    setShowEmail((prev) => !prev);
    setCopied(false);
  };

  const handleCopyEmail = async (e) => {
    e.stopPropagation();
    const text = `Subject: ${emailTemplate.subject}\n\n${emailTemplate.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleCardClick = (e) => {
    if (e.target.closest('a, button')) return;
    onSelect?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`rounded-2xl border p-6 transition-all duration-300 cursor-pointer ${
        selected
          ? isDark
            ? 'bg-zinc-900 border-hookline-500 ring-2 ring-hookline-500/60 shadow-lg shadow-hookline-500/10'
            : 'bg-white border-hookline-500 ring-2 ring-hookline-500/40 shadow-lg'
          : isDark
            ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md hover:shadow-md hover:border-zinc-700'
            : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
      }`}
    >
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
        {lead.phone && (
          <ContactRow label="Phone" isDark={isDark}>
            <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="text-hookline-500 hover:text-hookline-600 font-medium">
              {lead.phone}
            </a>
          </ContactRow>
        )}
        {lead.email && (
          <ContactRow label="Email" isDark={isDark}>
            <a href={`mailto:${lead.email}`} className="text-hookline-500 hover:text-hookline-600 font-medium break-all">
              {lead.email}
            </a>
          </ContactRow>
        )}
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

      <button
        type="button"
        onClick={handleGenerateEmail}
        className={`w-full mb-4 px-4 py-2.5 font-semibold rounded-xl transition text-sm ${
          showEmail
            ? isDark
              ? 'bg-hookline-500/10 text-hookline-300 border border-hookline-500/30 hover:bg-hookline-500/15'
              : 'bg-hookline-50 text-hookline-700 border border-hookline-200 hover:bg-hookline-100'
            : 'bg-hookline-500 hover:bg-hookline-600 text-white shadow-md shadow-hookline-500/20'
        }`}
      >
        {showEmail ? 'Hide template email' : 'Generate template email'}
      </button>

      {showEmail && (
        <div
          className={`rounded-xl p-4 mb-4 space-y-3 border ${
            isDark
              ? 'bg-hookline-500/10 border-hookline-500/30'
              : 'bg-hookline-50 border-hookline-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
              Subject
            </p>
            <p className={`text-sm font-medium ${isDark ? 'text-hookline-300' : 'text-hookline-900'}`}>{emailTemplate.subject}</p>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
              Message
            </p>
            <pre className={`text-sm whitespace-pre-wrap font-sans leading-relaxed ${isDark ? 'text-hookline-300' : 'text-hookline-900'}`}>
              {emailTemplate.body}
            </pre>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyEmail}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
                isDark
                  ? 'bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            {mailtoLink ? (
              <a
                href={mailtoLink}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-hookline-500 hover:bg-hookline-600 text-white transition"
              >
                Open in email app
              </a>
            ) : (
              <span className={`px-3 py-2 text-xs ${isDark ? 'text-hookline-400' : 'text-gray-400'}`}>
                No email on file — copy and send manually
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip(lead);
          }}
          className={`px-4 py-2.5 font-semibold rounded-xl transition text-sm ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
