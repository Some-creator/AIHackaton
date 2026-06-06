import { useState } from 'react';
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

export default function LeadCard({ lead, onSend, onSkip, sent, skipped }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showEmail, setShowEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const emailPreview = lead.email ? lead.email.split('\n').slice(0, 2).join(' ') : '';

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(lead);
    } finally {
      setSending(false);
    }
  };

  if (skipped) return null;

  return (
    <div className={`rounded-2xl border p-6 transition-all duration-300 hover:shadow-md ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur-md' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{lead.name}</h3>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{lead.address}</p>
          {lead.phone && <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{lead.phone}</p>}
        </div>
        {sent && (
          <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 text-xs font-semibold rounded-full">
            Sent
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <ScoreBadge label="Fit" score={lead.fitScore} isDark={isDark} />
        <ScoreBadge label="Budget" score={lead.budgetScore} isDark={isDark} />
        <ScoreBadge label="Response" score={lead.responseScore} isDark={isDark} />
        <ScoreBadge label="Priority" score={lead.priorityScore} highlight isDark={isDark} />
      </div>

      <div className={`rounded-lg p-4 mb-4 border ${isDark ? 'bg-hookline-950/20 border-hookline-900/40 text-hookline-300' : 'bg-hookline-50 border-hookline-100 text-hookline-900'}`}>
        <h4 className={`text-xs font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-hookline-400' : 'text-hookline-600'}`}>Hook</h4>
        <p className="text-sm leading-relaxed">{lead.hook}</p>
      </div>

      <div className={`rounded-lg p-4 mb-4 border ${isDark ? 'bg-zinc-950/40 border-zinc-800 text-zinc-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
        <h4 className={`text-xs font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Email Preview</h4>
        <p className="text-sm italic leading-relaxed">&ldquo;{emailPreview}...&rdquo;</p>
      </div>

      {showEmail && (
        <div className={`rounded-lg p-4 mb-4 border ${isDark ? 'bg-zinc-950/80 border-zinc-800 text-zinc-200' : 'bg-white border-gray-200 text-gray-800'}`}>
          <h4 className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Full Email</h4>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{lead.email}</p>
          {lead.sendStrategy && (
            <div className={`mt-4 pt-4 border-t text-xs space-y-1 ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-gray-200 text-gray-500'}`}>
              <p><strong>Channel:</strong> {lead.sendStrategy.channel}</p>
              <p><strong>Timing:</strong> {lead.sendStrategy.timing}</p>
              <p><strong>Follow-up:</strong> {lead.sendStrategy.followUp}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowEmail(!showEmail)}
          className={`flex-1 px-4 py-2.5 border font-semibold rounded-xl transition text-sm ${isDark ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
        >
          {showEmail ? 'Hide Email' : 'View Full Email'}
        </button>
        {!sent && (
          <>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 px-4 py-2.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition text-sm"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={() => onSkip(lead)}
              className={`px-4 py-2.5 font-semibold rounded-xl transition text-sm ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
