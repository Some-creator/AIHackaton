import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { buildLeadEmailTemplate, buildMailtoLink } from '../lib/leadEmailTemplate';

function ScoreBadge({ label, score, highlight, isDark, compact }) {
  const badgeClass = highlight
    ? 'bg-hookline-500 text-white'
    : isDark
      ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50'
      : 'bg-gray-100 text-gray-700';

  const scoreClass = highlight ? 'text-white' : isDark ? 'text-white' : 'text-gray-900';
  const labelClass = highlight ? 'text-hookline-100' : isDark ? 'text-zinc-500' : 'text-gray-500';

  return (
    <div className={`text-center rounded-lg ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} ${badgeClass}`}>
      <div className={`font-bold ${compact ? 'text-base' : 'text-lg'} ${scoreClass}`}>{score}</div>
      <div className={`text-[10px] leading-tight ${labelClass}`}>{label}</div>
    </div>
  );
}

function ContactItem({ label, children, isDark, compact }) {
  if (compact) {
    return (
      <div className={`flex gap-2 min-w-0 py-1 border-b last:border-b-0 ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 w-14 pt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
          {label}
        </span>
        <div className={`text-xs leading-snug min-w-0 ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{children}</div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
        {label}
      </div>
      <div className={`text-sm leading-snug ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>{children}</div>
    </div>
  );
}

function formatWebsiteUrl(website) {
  if (!website) return '';
  return website.startsWith('http') ? website : `https://${website}`;
}

function formatReviewCount(count) {
  const value = Number(count);
  if (!Number.isFinite(value) || value < 0) return null;
  return value.toLocaleString();
}

function StarRating({ rating, isDark }) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return null;
  const fullStars = Math.floor(value);
  const hasHalf = value - fullStars >= 0.25 && value - fullStars < 0.75;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < fullStars) return 'full';
    if (i === fullStars && hasHalf) return 'half';
    if (i === fullStars && value - fullStars >= 0.75) return 'full';
    return 'empty';
  });

  return (
    <div className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {stars.map((type, i) => (
        <span
          key={i}
          className={`text-sm leading-none ${
            type === 'empty'
              ? isDark ? 'text-zinc-600' : 'text-gray-300'
              : 'text-amber-400'
          }`}
        >
          {type === 'empty' ? '☆' : '★'}
        </span>
      ))}
    </div>
  );
}

function LeadReviewExcerpt({ lead, isDark, compact }) {
  const recentReview = lead.recentReviews?.[0];
  if (!recentReview?.text) return null;

  return (
    <div
      className={`rounded-lg border shrink-0 ${
        compact ? 'p-2.5' : 'p-4 mb-4'
      } ${isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}
    >
      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
        Recent review · {recentReview.author}
      </p>
      <p className={`text-xs leading-snug line-clamp-2 italic ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
        “{recentReview.text}”
      </p>
    </div>
  );
}

export default function LeadCard({
  lead,
  business,
  analysis,
  marketGap,
  onSkip,
  skipped,
  selected = false,
  onSelect,
  compact = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showEmail, setShowEmail] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(null);
  const [hookExpanded, setHookExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShowEmail(false);
    setEmailTemplate(null);
    setCopied(false);
    setHookExpanded(false);
  }, [lead.name]);

  if (skipped) return null;

  const websiteUrl = formatWebsiteUrl(lead.website);
  const mapsUrl = lead.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`
    : null;

  const mailtoLink = emailTemplate
    ? buildMailtoLink(lead.email, emailTemplate.subject, emailTemplate.body)
    : null;

  const handleGenerateEmail = (e) => {
    e.stopPropagation();
    if (showEmail) {
      setShowEmail(false);
      setEmailTemplate(null);
      setCopied(false);
      return;
    }
    setEmailTemplate(buildLeadEmailTemplate({ lead, business, analysis, marketGap }));
    setShowEmail(true);
    setCopied(false);
  };

  const handleCopyEmail = async (e) => {
    e.stopPropagation();
    if (!emailTemplate) return;
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

  const contactItems = [
    lead.phone && {
      label: 'Phone',
      node: (
        <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="text-hookline-500 hover:text-hookline-600 font-medium">
          {lead.phone}
        </a>
      ),
    },
    lead.email && {
      label: 'Email',
      node: (
        <a href={`mailto:${lead.email}`} className="text-hookline-500 hover:text-hookline-600 font-medium break-all">
          {lead.email}
        </a>
      ),
    },
    websiteUrl && {
      label: 'Website',
      node: (
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-hookline-500 hover:text-hookline-600 font-medium break-all">
          {lead.website}
        </a>
      ),
    },
    lead.address && {
      label: 'Address',
      node: mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-hookline-500 transition break-words">
          {lead.address}
        </a>
      ) : (
        lead.address
      ),
    },
  ].filter(Boolean);

  const cardClass = selected
    ? isDark
      ? 'bg-zinc-900 border-2 border-hookline-500 shadow-lg shadow-hookline-500/10'
      : 'bg-white border-2 border-hookline-500 shadow-lg'
    : isDark
      ? 'bg-zinc-900/60 border border-zinc-800 backdrop-blur-md hover:shadow-md hover:border-zinc-700'
      : 'bg-white border border-gray-200 shadow-sm hover:shadow-md';

  const headerBlock = (
    <>
      <div className={`flex items-start justify-between gap-3 shrink-0 ${compact ? 'mb-2' : 'mb-4'}`}>
        <h3 className={`font-bold min-w-0 ${compact ? 'text-base' : 'text-lg'} ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {lead.name}
        </h3>
        {(Number.isFinite(Number(lead.rating)) || formatReviewCount(lead.reviewCount)) && (
          <div className={`text-right shrink-0 rounded-lg border px-2.5 py-1.5 ${
            isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-gray-50 border-gray-200'
          }`}>
            {Number.isFinite(Number(lead.rating)) && (
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {Number(lead.rating).toFixed(1)}
                </span>
                <StarRating rating={lead.rating} isDark={isDark} />
              </div>
            )}
            {formatReviewCount(lead.reviewCount) && (
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                {formatReviewCount(lead.reviewCount)} reviews
                {lead.reviewSource === 'google' ? ' · Google' : lead.reviewSource === 'yelp' ? ' · Yelp' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      <div className={`grid grid-cols-4 gap-1.5 shrink-0 ${compact ? 'mb-2' : 'mb-4 gap-2'}`}>
        <ScoreBadge label="Fit" score={lead.fitScore} isDark={isDark} compact={compact} />
        <ScoreBadge label="Budget" score={lead.budgetScore} isDark={isDark} compact={compact} />
        <ScoreBadge label="Response" score={lead.responseScore} isDark={isDark} compact={compact} />
        <ScoreBadge label="Priority" score={lead.priorityScore} highlight isDark={isDark} compact={compact} />
      </div>

      <div
        className={`rounded-lg border shrink-0 ${compact ? 'p-2.5 mb-2' : 'p-4 mb-4'} ${
          isDark ? 'bg-hookline-950/20 border-hookline-900/40 text-hookline-300' : 'bg-hookline-50 border-hookline-100 text-hookline-900'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
            Why reach out
          </h4>
          {compact && lead.hook?.length > 140 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHookExpanded((prev) => !prev);
              }}
              className={`text-[10px] font-semibold ${isDark ? 'text-hookline-400 hover:text-hookline-300' : 'text-hookline-600 hover:text-hookline-700'}`}
            >
              {hookExpanded ? 'Less' : 'More'}
            </button>
          )}
        </div>
        <p className={`leading-snug ${compact ? 'text-xs' : 'text-sm'} ${compact && !hookExpanded ? 'line-clamp-2' : ''}`}>{lead.hook}</p>
      </div>
    </>
  );

  const bodyBlock = (
    <>
      <LeadReviewExcerpt lead={lead} isDark={isDark} compact={compact} />

      {contactItems.length > 0 && (
        <div
          className={`rounded-lg border ${compact ? 'p-2.5' : 'p-4 mb-4'} ${
            isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <h4 className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
            Contact information
          </h4>
          <div className={compact ? 'space-y-0' : 'grid gap-3 grid-cols-1'}>
            {contactItems.map((item) => (
              <ContactItem key={item.label} label={item.label} isDark={isDark} compact={compact}>
                {item.node}
              </ContactItem>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const footerBlock = (
    <div className={`shrink-0 flex flex-col gap-2 ${compact ? `pt-2 border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}` : ''}`}>
        <button
          type="button"
          onClick={handleGenerateEmail}
          className={`w-full font-semibold rounded-xl transition text-sm ${
            compact ? 'px-3 py-2' : 'px-4 py-2.5 mb-4'
          } ${
            showEmail
              ? isDark
                ? 'bg-hookline-500/10 text-hookline-300 border border-hookline-500/30 hover:bg-hookline-500/15'
                : 'bg-hookline-50 text-hookline-700 border border-hookline-200 hover:bg-hookline-100'
              : 'bg-hookline-500 hover:bg-hookline-600 text-white shadow-md shadow-hookline-500/20'
          }`}
        >
          {showEmail ? 'Hide template email' : 'Generate template email'}
        </button>

        {showEmail && emailTemplate && (
          <div
            className={`rounded-xl space-y-2 border max-h-36 overflow-y-auto ${
              compact ? 'p-3' : 'p-4 mb-4'
            } ${
              isDark
                ? 'bg-hookline-500/10 border-hookline-500/30'
                : 'bg-hookline-50 border-hookline-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
                Subject
              </p>
              <p className={`text-xs font-medium ${isDark ? 'text-hookline-300' : 'text-hookline-900'}`}>{emailTemplate.subject}</p>
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>
                Message
              </p>
              <pre className={`text-xs whitespace-pre-wrap font-sans leading-snug ${isDark ? 'text-hookline-300' : 'text-hookline-900'}`}>
                {emailTemplate.body}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyEmail}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  isDark
                    ? 'bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {mailtoLink ? (
                <a
                  href={mailtoLink}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-hookline-500 hover:bg-hookline-600 text-white transition"
                >
                  Open in email app
                </a>
              ) : (
                <span className={`px-3 py-1.5 text-xs ${isDark ? 'text-hookline-400' : 'text-gray-400'}`}>
                  No email on file
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
            className={`font-semibold rounded-xl transition text-sm ${compact ? 'px-3 py-1.5' : 'px-4 py-2.5'} ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Dismiss
          </button>
        </div>
      </div>
  );

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
      className={`rounded-2xl transition-all duration-300 cursor-pointer flex flex-col overflow-hidden ${
        compact ? 'h-full min-h-0 p-4' : 'p-6'
      } ${cardClass}`}
    >
      {compact ? (
        <>
          <div className="shrink-0">{headerBlock}</div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1 space-y-2">
            {bodyBlock}
          </div>
          {footerBlock}
        </>
      ) : (
        <>
          {headerBlock}
          {bodyBlock}
          {footerBlock}
        </>
      )}
    </div>
  );
}
