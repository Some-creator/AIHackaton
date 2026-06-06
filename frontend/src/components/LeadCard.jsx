import { useState } from 'react';

function ScoreBadge({ label, score, highlight }) {
  return (
    <div className={`text-center px-3 py-2 rounded-lg ${highlight ? 'bg-hookline-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
      <div className={`text-lg font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>{score}</div>
      <div className={`text-xs ${highlight ? 'text-hookline-100' : 'text-gray-500'}`}>{label}</div>
    </div>
  );
}

export default function LeadCard({ lead, onSend, onSkip, sent, skipped }) {
  const [showEmail, setShowEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const emailPreview = lead.email.split('\n').slice(0, 2).join(' ');

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{lead.name}</h3>
          <p className="text-sm text-gray-500">{lead.address}</p>
          {lead.phone && <p className="text-sm text-gray-400">{lead.phone}</p>}
        </div>
        {sent && (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            Sent
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <ScoreBadge label="Fit" score={lead.fitScore} />
        <ScoreBadge label="Budget" score={lead.budgetScore} />
        <ScoreBadge label="Response" score={lead.responseScore} />
        <ScoreBadge label="Priority" score={lead.priorityScore} highlight />
      </div>

      <div className="bg-hookline-50 border border-hookline-100 rounded-lg p-4 mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-hookline-600 mb-1">Hook</h4>
        <p className="text-sm text-hookline-900">{lead.hook}</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Email Preview</h4>
        <p className="text-sm text-gray-700 italic">&ldquo;{emailPreview}...&rdquo;</p>
      </div>

      {showEmail && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Full Email</h4>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{lead.email}</p>
          {lead.sendStrategy && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
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
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-sm"
        >
          {showEmail ? 'Hide Email' : 'View Full Email'}
        </button>
        {!sent && (
          <>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 px-4 py-2.5 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition text-sm"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={() => onSkip(lead)}
              className="px-4 py-2.5 text-gray-400 hover:text-gray-600 font-medium rounded-xl transition text-sm"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
