import { useState } from 'react';

function normalizeUrl(url) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function socialLabel(url) {
  if (/instagram/i.test(url)) return 'Instagram';
  if (/facebook/i.test(url)) return 'Facebook';
  if (/twitter|x\.com/i.test(url)) return 'X';
  if (/tiktok/i.test(url)) return 'TikTok';
  if (/linkedin/i.test(url)) return 'LinkedIn';
  if (/youtube/i.test(url)) return 'YouTube';
  return 'Social';
}

function findScrape(url, socialScrapes) {
  const key = normalizeUrl(url);
  return socialScrapes?.find((s) => normalizeUrl(s.url) === key);
}

export default function SocialProfileTags({ items, socialScrapes = [], onChange }) {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState(null);

  const addItem = () => {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setInput('');
  };

  const removeItem = (index) => {
    const removed = items[index];
    onChange(items.filter((_, i) => i !== index));
    if (selected && normalizeUrl(selected) === normalizeUrl(removed)) {
      setSelected(null);
    }
  };

  const handleSelect = (url) => {
    setSelected((prev) => (normalizeUrl(prev) === normalizeUrl(url) ? null : url));
  };

  const selectedScrape = selected ? findScrape(selected, socialScrapes) : null;

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">Social Profiles</label>
      <p className="text-xs text-gray-400 mt-0.5">Click a profile to view scraped data</p>

      <div className="mt-2 flex flex-wrap gap-2 min-h-[2.5rem] p-3 rounded-lg border border-gray-300 bg-gray-50">
        {items.length === 0 && (
          <span className="text-sm text-gray-400 italic">No profiles yet — add one below</span>
        )}
        {items.map((item, i) => {
          const hasData = Boolean(findScrape(item, socialScrapes));
          const isSelected = selected && normalizeUrl(selected) === normalizeUrl(item);
          return (
            <button
              key={`${item}-${i}`}
              type="button"
              onClick={() => handleSelect(item)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition ${
                isSelected
                  ? 'bg-hookline-500 text-white ring-2 ring-hookline-300'
                  : hasData
                    ? 'bg-hookline-100 text-hookline-800 hover:bg-hookline-200 cursor-pointer'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300 cursor-pointer'
              }`}
            >
              <span>{socialLabel(item)}</span>
              {hasData && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Data scraped" />
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeItem(i); } }}
                className={`w-4 h-4 flex items-center justify-center rounded-full ${
                  isSelected ? 'hover:bg-hookline-600' : 'hover:bg-hookline-200'
                }`}
                aria-label={`Remove ${item}`}
              >
                ×
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded-xl border border-hookline-200 bg-hookline-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-hookline-800">
              {socialLabel(selected)} data
            </h4>
            <span className="text-xs text-hookline-600 truncate max-w-[200px]">{selected}</span>
          </div>

          {selectedScrape ? (
            <>
              <div className="flex gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white text-gray-600 border border-gray-200">
                  Source: {selectedScrape.source || 'unknown'}
                </span>
                {selectedScrape.mock && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Demo data</span>
                )}
              </div>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed bg-white rounded-lg p-3 border border-gray-200 max-h-64 overflow-y-auto">
                {selectedScrape.content}
              </pre>
            </>
          ) : (
            <p className="text-sm text-gray-500 italic bg-white rounded-lg p-3 border border-gray-200">
              No data was scraped from this profile. It may have been added manually or the scrape failed.
            </p>
          )}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder="e.g. instagram.com/yourbusiness"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hookline-500 outline-none text-sm"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!input.trim()}
          className="px-4 py-2 bg-hookline-500 hover:bg-hookline-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}
